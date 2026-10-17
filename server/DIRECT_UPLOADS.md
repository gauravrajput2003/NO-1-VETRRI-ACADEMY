# Direct mobile uploads

Teacher/admin study material creation and file replacement, and admin training
video file uploads, now send file bytes from the phone directly to Cloudinary.
Render signs the request and verifies the completed asset; MongoDB stores the
Cloudinary URL and metadata. Existing multipart endpoints remain available for
already published app versions. Teacher approval and access checks remain in place.

## Rollout

1. Deploy the backend first. It uses the existing Cloudinary and JWT environment
   variables; no new credentials or dependencies are required.
2. Ensure the sparse unique `directUploadId` indexes in StudyMaterial and
   TrainingVideo are created (normal Mongoose index creation). These prevent
   duplicate records if confirmation is retried concurrently.
3. Release a new Android app version. Backend deployment alone cannot change the
   upload method in the existing Play Store app. No EAS build is part of this change.
4. On a device, test a teacher material, its approval, an admin replacement, and a
   training video. Interrupt the network midway, restore it and retry. Also test
   closing/reopening the app and retrying the restored upload form. Confirm that
   exactly one record is saved and the file opens correctly.

## Recovery and limits

- Uploads use 6 MiB chunks and up to four attempts per temporary failure, with
  backoff. Chunk offsets advance only after Cloudinary acknowledges the chunk.
- Checkpoints and unfinished forms are stored on the phone, scoped by account.
  Reopen the respective upload screen and tap Upload/Update to resume. The app
  does not promise to continue transferring data while closed or force-stopped.
- Phone cache files can be cleared by Android. If the selected file is gone,
  select it again. Checkpoints expire after 24 hours. Cloudinary may expire an
  incomplete upload sooner; detected expired streams restart from the beginning.
- Once Cloudinary completes the file, retrying a failed database confirmation
  reuses that file. The server verifies asset ownership scope, type and byte size
  against a signed upload receipt before saving metadata. No API secret reaches
  the phone.
- Maximum accepted size is 500 MiB for video and 50 MiB for other files, subject
  to stricter existing picker limits and the Cloudinary account's own upload and
  storage limits. Chunking does not increase provider quotas.
- Cloudinary asset verification uses its Admin API. Its account rate limits still
  apply; temporary failures leave the checkpoint available for another attempt.
- This change covers the Expo app material/training screens. The separate website
  client and other upload features retain their existing behavior.
- Abandoned uploaded files are retained so failed confirmations can be recovered;
  periodic cleanup of unreferenced Cloudinary assets is a separate storage policy.

Protocol reference: [Cloudinary chunked asset uploads](https://cloudinary.com/documentation/upload_images#chunked_asset_upload).

Automated tests use mocked Cloudinary, native file handles and HTTP requests.
The Android JavaScript export checks bundling; live device/provider validation is
still required before publishing.
