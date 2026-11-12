# Notification capture: platform scope

Checked 12 November 2026. Payment sources shipped in this iteration are local
labels, not financial-service connections. Notification ingestion is not shipped.

- Web/PWA: the Notifications API accesses notifications created by the app's own
  service-worker registration. Adding to the home screen does not grant access to
  GCash, SMS, or another app's notification stream.
  [MDN API scope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/getNotifications)
- Android native: NotificationListenerService receives notification events after
  the user enables notification access. This could support on-device payment
  detection through a native companion. It requires real-device tests against
  actual GCash payloads; fields may be omitted, redacted, or formatted differently.
  [Android API](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- iOS: the public notification service extension processes the containing app's
  own remote notifications. It is not a listener for other apps. A general GCash
  notification listener is therefore not an available public-API implementation.
  [Apple extension](https://developer.apple.com/documentation/usernotifications/unnotificationserviceextension)
  [Apple sandbox model](https://support.apple.com/en-ie/guide/security-pdf/sec15bfe098e/1/web/1)

## Proposed Android ingestion, not implemented

Opt in to selected payment apps. Match source package identity before parsing
notification text locally. Extract currency, amount, merchant, provider reference,
and timestamp. An amount alone must not be treated as a purchase: incoming funds,
wallet top-ups, transfers, failed payments, refunds, promotions, and OTPs are not
expenses. Map only a known payment source; ask when the mapping is ambiguous.

Initially send detected payments to a review inbox with the original source and
an editable preview. Persist provider references or notification identities to
avoid duplicates from reposts and updates. Also check overlap with manual entries;
do not silently delete or merge a manual record. Only enable automatic acceptance
for demonstrated supported formats, with correction and undo available.

Native storage and browser localStorage are separate. A companion needs an
explicit local import/handoff or a native-hosted shared datastore with migration
and backup; installing a wrapper does not automatically share existing browser
records. Keep this design separate from the working PWA and preserve local data.

For iPhone/web, user-initiated paste/share or statement import are possible product
directions, but are not implemented here. Do not imply background capture or
request web push permission as a substitute.
