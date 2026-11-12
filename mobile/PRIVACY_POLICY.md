# Privacy Policy for Togetherly

*Last Updated: November 2026*

**Togetherly** ("A little moment. A stronger connection.") is a private relationship platform designed exclusively for two consenting adults to nurture and deepen their connection. Your privacy, intimacy, and data security are the foundation of everything we build.

---

## 1. Core Privacy Commitments

1. **Intimate Couple Isolation**: Your space is accessible exclusively to you and your verified partner. No other couple, user, or third party can view your shared activities, questions, drawings, or memories.
2. **End-to-End Encryption (E2EE)**: Sensitive content, including love notes, private letters, and personal canvas drawings, is protected with genuine client-side End-to-End Encryption (AES-256-GCM / ECDH). The private cryptographic keys are stored exclusively in your device's hardware keychain (`SecureStore`) and never transmitted to our servers.
3. **On-Device Biometrics**: Biometric data (Face ID, Touch ID, Fingerprint) is processed entirely by your device operating system via local APIs. Togetherly never captures, transmits, or stores biometric identifiers.
4. **No Advertising or Data Selling**: We do not sell your personal data, couple answers, or photos to advertisers, data brokers, or third parties.

---

## 2. Information We Collect

- **Account Information**: First name, email address, password hash (salted using bcrypt; passwords are never stored in plain text), and date of birth (to enforce the strict 18+ requirement).
- **Relationship Profile**: Relationship stage, anniversary date, living arrangement (living together or long distance), and partner connection status.
- **Couple Content**: Daily question responses, photos uploaded to your private space, collaborative drawings, and game scores.
- **Device & Session Metadata**: Device name, platform (Android / iOS), and session timestamps to allow you to review and revoke active logins from your Security dashboard.

---

## 3. Device Permissions & Purpose

Togetherly requests the following device permissions only when necessary:

| Permission | Platform | Purpose |
| :--- | :--- | :--- |
| **Camera** | Android & iOS | Capture daily photo challenges and instant moments for your partner. |
| **Photo Library** | Android & iOS | Select and upload shared couple memories and save drawings to your device gallery. |
| **Biometrics / Face ID** | Android & iOS | Securely lock and protect your private sanctuary on your device. |
| **Notifications** | Android & iOS | Receive timely alerts when your partner answers a question, leaves a love note, or joins an activity. Message contents are redacted on lock screens by default for your privacy. |

---

## 4. Offline Storage & Local Synchronization

Togetherly utilizes an offline-first architecture powered by on-device SQLite databases. When offline, your activities, sketches, and notes are securely queued locally and replayed automatically when internet connectivity returns.

---

## 5. Your Data Rights & Deletion

- **Data Portability**: You may export a complete, machine-readable JSON archive of your couple memories, notes, and activity history at any time from **Profile > Privacy & Data Rights**.
- **Permanent Account Deletion**: You can permanently delete your account and all associated data at any time. Upon deletion, your personal records, relationship workspace, uploaded photos, drawings, and message history are permanently erased from our production databases.

---

## 6. Contact Us

For privacy questions or data requests, contact our security team at `privacy@togetherly.app`.

