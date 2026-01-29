#!/usr/bin/env node

/* eslint-disable no-console */

const admin = require("firebase-admin");

const apply = process.argv.includes("--apply");
const dryRun = !apply;

function ensureAdmin() {
  if (admin.apps.length > 0) {
    return;
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function monthKeyFromDate(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value.slice(0, 7);
  }
  if (value.toDate) {
    return value.toDate().toISOString().slice(0, 7);
  }
  return null;
}

async function backfillCollection(db, clientId, collectionName) {
  const stats = { total: 0, updated: 0 };
  let lastDoc = null;

  while (true) {
    let query = db.collection("clients").doc(clientId).collection(collectionName).orderBy("__name__").limit(400);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    const snap = await query.get();
    if (snap.empty) {
      break;
    }

    const batch = db.batch();
    snap.docs.forEach((docSnap) => {
      stats.total += 1;
      const data = docSnap.data() || {};
      const update = {};

      const dateField = collectionName === "paids" ? data.startDate : data.date;
      if (!data.monthKey) {
        const mk = monthKeyFromDate(dateField);
        if (mk) {
          update.monthKey = mk;
        }
      }

      if (!data.createdAt) {
        update.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      if (!data.updatedAt) {
        if (data.createdAt) {
          update.updatedAt = data.createdAt;
        } else {
          update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        }
      }

      if (Object.keys(update).length > 0) {
        stats.updated += 1;
        if (!dryRun) {
          batch.update(docSnap.ref, update);
        }
      }
    });

    if (!dryRun && stats.updated > 0) {
      await batch.commit();
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return stats;
}

async function run() {
  ensureAdmin();
  const db = admin.firestore();

  const result = {};
  const clientsSnap = await db.collection("clients").get();

  for (const clientDoc of clientsSnap.docs) {
    const clientId = clientDoc.id;
    result[clientId] = {};

    for (const collectionName of ["posts", "events", "paids"]) {
      const stats = await backfillCollection(db, clientId, collectionName);
      result[clientId][collectionName] = stats;
    }
  }

  console.log("Backfill summary:");
  Object.entries(result).forEach(([clientId, collections]) => {
    console.log(`- client ${clientId}`);
    Object.entries(collections).forEach(([name, stats]) => {
      console.log(`  - ${name}: scanned=${stats.total} updated=${stats.updated}`);
    });
  });

  if (dryRun) {
    console.log("Dry run only. Use --apply to write changes.");
  }
}

run().catch((err) => {
  console.error("Backfill failed", err);
  process.exit(1);
});
