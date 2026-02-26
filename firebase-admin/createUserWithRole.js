// This script is for Node.js (not for the browser)
// Usage: node src/firebase-admin/createUserWithRole.js

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();
const auth = getAuth();

async function createUserWithRole(email, password, name, role) {
  if (!email.endsWith('@yesyes.com')) {
    throw new Error('Only @yesyes.com emails are allowed');
  }
  // Create user in Firebase Auth
  const userRecord = await auth.createUser({ email, password, displayName: name });
  // Add user profile to Firestore
  await db.collection('users').doc(userRecord.uid).set({
    email,
    name,
    role,
  });
  console.log(`User ${email} created with role ${role}`);
}

// Example usage:
// createUserWithRole('admin@yesyes.com', 'adminpassword', 'Admin User', 'admin');
// createUserWithRole('sales@yesyes.com', 'salespassword', 'Sales User', 'sales');

// To use interactively, uncomment below:
// const [,, email, password, name, role] = process.argv;
// createUserWithRole(email, password, name, role).catch(console.error);

module.exports = { createUserWithRole };
