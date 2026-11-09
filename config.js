// Where the dashboard reads its data from.
// Use ONE of the two options below. If neither is set (or the sheet can't be
// reached), the dashboard falls back to data/snapshot.csv and says so on screen.
window.JWB_CONFIG = {
  // Option A (recommended): Google Sheets > File > Share > Publish to web >
  // pick the "Inventory" tab, choose CSV, Publish, then paste the link here.
  publishedCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjC3oEJBzfEpYrKD9MRnRyqxFXc4-e8HwVDuHdT8Hj0I1DZWMQoIsVoS_CkRaMF9LfE8jVUdCxhu17/pub?gid=0&single=true&output=csv",

  // Option B: the sheet's ID (the long string in its URL) if it is shared as
  // "Anyone with the link can view".
  sheetId: "1lI0lQde9cJkygf1_1-d8jsX3Oz4XKLFzlXcyzile8gg",
  sheetName: "Inventory",

  // How often the page re-reads the sheet while open.
  refreshSeconds: 300,
};
