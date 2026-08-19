use std::env;
use std::sync::Arc;

use anyhow::{bail, Context, Result};
use collab::core::collab::{CollabOptions, DataSource};
use collab::core::origin::CollabOrigin;
use collab::entity::{EncodedCollab, EncoderVersion};
use collab::preclude::Collab;
use postgres::{Client, NoTls};
use yrs::{Any, Array, Map, Out, ReadTxn};

#[derive(Default)]
struct Stats {
  rows_scanned: usize,
  rows_decoded: usize,
  rows_changed: usize,
  replacements: usize,
  empty_rows: usize,
  decode_errors: usize,
}

fn replace_any(value: Any, old: &str, new: &str) -> (Any, usize) {
  match value {
    Any::String(value) => {
      let count = value.matches(old).count();
      if count == 0 {
        (Any::String(value), 0)
      } else {
        (Any::String(Arc::from(value.replace(old, new))), count)
      }
    },
    Any::Array(values) => {
      let mut changed = 0;
      let values = values
        .iter()
        .cloned()
        .map(|value| {
          let (value, count) = replace_any(value, old, new);
          changed += count;
          value
        })
        .collect::<Vec<_>>();
      (Any::Array(values.into()), changed)
    },
    Any::Map(values) => {
      let mut changed = 0;
      let values = values
        .iter()
        .map(|(key, value)| {
          let (value, count) = replace_any(value.clone(), old, new);
          changed += count;
          (key.clone(), value)
        })
        .collect();
      (Any::Map(Arc::new(values)), changed)
    },
    other => (other, 0),
  }
}

fn replace_out(txn: &mut yrs::TransactionMut<'_>, value: Out, old: &str, new: &str) -> usize {
  match value {
    Out::YMap(map) => {
      let entries = map
        .iter(txn)
        .map(|(key, value)| (key.to_string(), value))
        .collect::<Vec<_>>();
      let mut changed = 0;
      for (key, value) in entries {
        match value {
          Out::Any(value) => {
            let (value, count) = replace_any(value, old, new);
            if count > 0 {
              map.insert(txn, key, value);
              changed += count;
            }
          },
          nested => changed += replace_out(txn, nested, old, new),
        }
      }
      changed
    },
    Out::YArray(array) => {
      let values = array.iter(txn).enumerate().collect::<Vec<_>>();
      let mut changed = 0;
      for (index, value) in values {
        match value {
          Out::Any(value) => {
            let (value, count) = replace_any(value, old, new);
            if count > 0 {
              array.remove(txn, index as u32);
              array.insert(txn, index as u32, value);
              changed += count;
            }
          },
          nested => changed += replace_out(txn, nested, old, new),
        }
      }
      changed
    },
    Out::Any(value) => replace_any(value, old, new).1,
    // Text and XML content is deliberately not rewritten: replacing a whole
    // rich-text node would discard formatting. AppFlowy stores file/media URLs
    // in map/array values, which are covered above.
    _ => 0,
  }
}

fn open_collab(object_id: &str, encoded: EncodedCollab) -> Result<Collab> {
  let source = match encoded.version {
    EncoderVersion::V1 => DataSource::DocStateV1(encoded.doc_state.to_vec()),
    EncoderVersion::V2 => DataSource::DocStateV2(encoded.doc_state.to_vec()),
  };
  let options = CollabOptions::new(object_id.to_owned(), 1).with_data_source(source);
  Collab::new_with_options(CollabOrigin::Server, options).context("open Yjs document")
}

fn main() -> Result<()> {
  let args = env::args().skip(1).collect::<Vec<_>>();
  if args.len() < 2 || args.len() > 3 {
    bail!("usage: appflowy-url-migrator OLD_ORIGIN NEW_ORIGIN [--apply]");
  }
  let old = args[0].trim_end_matches('/');
  let new = args[1].trim_end_matches('/');
  let apply = args.get(2).map(String::as_str) == Some("--apply");
  if old.is_empty() || new.is_empty() || old == new {
    bail!("origins must be non-empty and different");
  }

  let database_url = env::var("DATABASE_URL").context("DATABASE_URL is required")?;
  let mut client = Client::connect(&database_url, NoTls).context("connect PostgreSQL")?;
  let mut tx = client.transaction()?;
  let rows = tx.query(
    "SELECT oid::text, blob FROM af_collab WHERE deleted_at IS NULL ORDER BY oid FOR UPDATE",
    &[],
  )?;
  let mut updates = Vec::new();
  let mut stats = Stats::default();

  for row in rows {
    stats.rows_scanned += 1;
    let oid: String = row.get(0);
    let blob: Vec<u8> = row.get(1);
    if blob.is_empty() {
      stats.empty_rows += 1;
      continue;
    }
    let encoded = match EncodedCollab::decode_from_bytes(&blob) {
      Ok(value) => value,
      Err(error) => {
        stats.decode_errors += 1;
        eprintln!("SKIP oid={oid}: cannot decode EncodedCollab: {error}");
        continue;
      },
    };
    let mut collab = match open_collab(&oid, encoded) {
      Ok(value) => value,
      Err(error) => {
        stats.decode_errors += 1;
        eprintln!("SKIP oid={oid}: {error:#}");
        continue;
      },
    };
    stats.rows_decoded += 1;

    let replacements = {
      let mut txn = collab.context.transact_mut();
      let roots = txn.root_refs().map(|(_, value)| value).collect::<Vec<_>>();
      roots
        .into_iter()
        .map(|value| replace_out(&mut txn, value, old, new))
        .sum::<usize>()
    };

    if replacements > 0 {
      let encoded = collab
        .encode_collab_v1(|_| Ok::<(), ()>(()))
        .map_err(|_| anyhow::anyhow!("encode collab {oid}"))?
        .encode_to_bytes()?;
      println!("MATCH oid={oid} replacements={replacements}");
      stats.rows_changed += 1;
      stats.replacements += replacements;
      updates.push((oid, encoded));
    }
  }

  if apply {
    for (oid, blob) in &updates {
      tx.execute(
        "UPDATE af_collab SET blob = $1::bytea, len = octet_length($1::bytea), updated_at = now(), indexed_at = NULL WHERE oid::text = $2",
        &[blob, oid],
      )?;
    }
    tx.commit()?;
  } else {
    tx.rollback()?;
  }

  println!(
    "SUMMARY mode={} scanned={} decoded={} changed_rows={} replacements={} empty_rows={} decode_errors={}",
    if apply { "apply" } else { "dry-run" },
    stats.rows_scanned,
    stats.rows_decoded,
    stats.rows_changed,
    stats.replacements,
    stats.empty_rows,
    stats.decode_errors
  );
  Ok(())
}
