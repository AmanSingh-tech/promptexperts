# AILOGRACER Transcript Capture

A Chrome extension that sends the conversation open in ChatGPT, Claude or Gemini to one of your open AILOGRACER attempts. Messages arrive as imported transcript and are reviewed like any other.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select this folder.

## Use

1. Log in to AILOGRACER in the same browser and open a challenge, which starts an attempt.
2. Open the conversation in ChatGPT (`chatgpt.com`), Claude (`claude.ai`) or Gemini (`gemini.google.com`).
3. Click the extension, pick the attempt and choose **Send conversation**.

Scroll to the start of a long conversation first, because these sites only keep part of it on the page. Sending again adds only the messages that are new since the last send. It works by position in the conversation, so messages edited after sending aren't updated.

The extension defaults to `http://localhost:3000`. For a deployed site, set the address under **Site address** in the popup.

The extension reads the page only when you open the popup. It sends the conversation only to your AILOGRACER site, and only when you choose **Send conversation**.

## If capture stops working

The sites don't offer an API for this, so `extract.js` reads their page structure, which can change without notice. If no messages are found, update that site's selector in `extract.js`, or use **Import** in the workspace instead.
