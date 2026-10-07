# WhatsApp Lead Research Toolkit

**Find relevant WhatsApp groups and contact links, organize visible member information, and prepare personalized messages with a free Chrome extension.**

Built by **Hazem El Shtry** with AI assistance, this project combines link discovery and a WhatsApp Web member collection interface. Change your audience keywords and location to research different markets without buying a lead database.

**Time = Knowledge = Value**  
Maximize your productivity. Minimize wasted time.

## What you can do

- Search Google or Facebook for WhatsApp group invitations and contact links.
- Narrow Google searches to a selected website or a custom domain.
- Filter contact results by calling-code prefix.
- Pause and resume unfinished link searches.
- Copy discovered links or export them as CSV or text.
- Collect member details visible in a WhatsApp Web group interface, where you have permission to do so.
- Export a member CSV with a personalized message column and conversation links.

This is a research and message-preparation tool. It does not automatically join groups, reveal hidden phone numbers, or send messages for you. Results depend on the available pages, your access, and the current website interfaces.

## Requirements

- Desktop Google Chrome with permission to load unpacked extensions.
- The extracted extension folder containing `manifest.json`.
- An internet connection.
- A signed-in WhatsApp Web session for member collection.
- Access to Facebook search when using the Facebook option.

The supplied implementation does not require a paid API key, a subscription, or a build command. The manifest uses Manifest V3 and declares version **1.0.1**.

## Installation

1. Download this repository using **Code → Download ZIP**, or use your local copy of the extension.
2. Extract the ZIP file.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the folder that directly contains `manifest.json`. If the download contains a wrapper folder, open it to locate the extension folder.
7. Open the extension from Chrome’s extensions menu. Pin it if you want quicker access.

You should see two tabs: **Find Links** and **WhatsApp Web Scraper**.

Keep the extension folder on your computer while it is installed. If you change its files, use **Reload** on its card in `chrome://extensions`, then refresh the relevant website tab.

## Find groups and contact links

### Google search

1. Open **Find Links** and select Google.
2. Choose groups or contacts.
3. Select a website to search, or use **Add Custom** for another domain.
4. Enter your audience keyword and location. For example, a marketing consultant might research `realtor` and `Miami`; replace these with your own market.
5. For contact searches, choose a calling-code filter if needed.
6. Set the search-page count and click **Start Search**.

The selected website is used in a Google search query. Selecting Instagram, LinkedIn, or another domain does not give the extension access to every page or account on that platform.

### Facebook search

Select Facebook, choose groups or contacts, and enter the relevant search terms. The extension scans visible Facebook search results and scrolls through them. If you start from an existing Facebook search, review the filters applied there, including location filters where available.

### Search controls

| Control | Purpose |
|---|---|
| Start Search | Start a search with the selected settings. |
| Stop | Pause an active search. A second stop on a paused task ends it. |
| Resume | Continue an unfinished paused search. |
| Copy | Copy collected links. |
| CSV / text export | Save the collected links locally. |
| Open Links | Open the collected links in separate browser tabs. More than 15 links triggers a confirmation. |
| Clear | Clear the link results and deactivate the current search task. |

Review results before using them. A matching keyword or phone prefix is not proof that a contact belongs to your intended market. Some calling codes cover multiple countries or territories. Missing names or profile photos do not, by themselves, prove that an account or invitation is invalid.

## Collect visible group member information

Only collect information you are authorized to access and use. Joining a group does not automatically give you permission to collect its members’ details or send them marketing messages.

1. Open the relevant group in WhatsApp Web.
2. Open the group information and member list. Choose **View All** where available.
3. Open the extension’s **WhatsApp Web Scraper** tab.
4. Click **Inject** to display the collection panel.
5. Click **Start Scrolling** and monitor progress.
6. Click **STOP** before exporting or changing groups.
7. Click **Download Members** and follow the message-template prompts.

The panel also includes **Reset** to clear stored member records. To keep groups separate, use this sequence:

**STOP → Download Members → Reset → open the next group.**

Reset does not stop an active collection. Avoid injecting the script repeatedly into the same page while it is running; refresh the page before starting a fresh session if necessary.

## Personalization and CSV export

Use the exact text `First Name` in the message template wherever the available first name should appear. For example, for someone who has requested information:

```text
Hi First Name, here are the details you requested. Let me know if you have any questions.
```

The tool uses the available display name for personalization. If no first name is available, the placeholder is removed. Review the output before sending.

The optional reference prompt adds a random `[Ref: XXXXX]` to each message. These references do not provide protection against spam detection, account restrictions, or bans.

The member export contains these columns:

| Column | Contents |
|---|---|
| Contact | The collected contact identifier. |
| Type | The identifier type recorded by the collector. |
| Username | A username, when available. |
| Phone Number | A visible phone number, when available. |
| Name | The collected display name. |
| First Name | The first name derived from the display name. |
| Description | Description text, when available. |
| Send Message | A spreadsheet hyperlink formula for the generated conversation link. |
| Message | The prepared message text. |

The download is **CSV**, not an `.xlsx` workbook. Spreadsheet applications may handle phone numbers, character encoding, and hyperlink formulas differently. Import phone-number columns as text when necessary to preserve their formatting.

For valid supported phone-number entries, a conversation link opens WhatsApp with prepared text. You still review the message and click Send yourself. Username-based links are generated by the code, but successful conversation routing is not guaranteed.

**Spreadsheet safety:** collected names and descriptions are external input. The export quotes CSV values but does not neutralize spreadsheet formulas in those fields. Inspect the CSV in a text editor or import untrusted fields as text before evaluating formulas. Review generated links before opening them.

## Permissions and local data

| Manifest permission | Use in this extension |
|---|---|
| `storage` | Save interface settings, link-search state, and collected links. |
| `tabs` | Work with search tabs and open collected links. |
| `activeTab` | Access the active tab as part of the user-triggered workflow. |
| `scripting` | Inject the WhatsApp Web collection script. |

The manifest requests host access for Google, Facebook, and WhatsApp Web. Link-search content scripts run on matching Google and Facebook search pages. A custom Google search domain does not add a new host permission.

- Search settings and results use `chrome.storage.local`.
- Member records use IndexedDB with database name `whatsapp-members-storage-v4` and store name `members`, in the WhatsApp Web page context.
- Member records can persist across sessions and groups. They are not automatically separated into independent group databases.
- Exports are downloaded to your computer.
- The supplied JavaScript does not define an external analytics service or a separate upload backend. Search requests and opened links still communicate with the relevant websites.

To clear collected data, use **Clear** in Find Links and, after stopping collection, **Reset** in the member panel. Delete downloaded exports separately when no longer needed. Removing the extension should not be treated as proof that WhatsApp Web’s stored member data or your downloaded files have been erased.

## Troubleshooting

| Problem | What to check |
|---|---|
| Chrome cannot load the extension | Extract the ZIP and select the folder containing `manifest.json`. Check Developer mode. |
| No search results | Try a different keyword, location, source website, or broader phrase. Check that the search page has loaded. |
| A contact link contains unexpected digits | Review the original result. The current parser can sometimes include adjacent numeric text in a contact URL. |
| The member counter does not increase | Open the member list and View All where available. Check that entries are loading. Website changes can break selectors. |
| Old records appear in a new export | Stop collection, export the existing data, and Reset before switching groups. |
| More than one collection panel or unexpected activity | Stop collection and refresh the WhatsApp Web tab before injecting again. |
| CSV formatting looks incorrect | Use your spreadsheet application’s CSV import options and preserve phone numbers as text. |
| A conversation link fails | Verify the exported identifier and link. Not every collected identifier is guaranteed to support conversation routing. |

The tool depends on third-party website markup. A working demonstration is not a guarantee of future compatibility, complete collection, or a specific number of leads.

## Educational purpose and responsible use

This project is provided for educational purposes: understanding browser extensions, page interaction, local data storage, CSV exports, and permission-based lead research workflows.

Use it only with information you are authorized to access, collect, and process. Respect applicable platform terms, group rules, privacy requirements, and recipients’ communication preferences. Do not use it to bypass access controls, reveal private information, send unsolicited bulk messages, or evade platform enforcement. Stop contacting anyone who declines or asks you to stop.

## Disclaimer

This project is provided as is, without a guarantee of accuracy, completeness, availability, fitness for a particular purpose, or uninterrupted operation. Use is at your own discretion and risk. You are responsible for reviewing collected data and messages, obtaining any required permissions, and deciding whether your use is appropriate.

The creator does not guarantee lead quality, business results, successful delivery, or protection from account restrictions. An educational label does not authorize prohibited activity or replace consent. This disclaimer does not waive rights or obligations that cannot be excluded under applicable law.

This is an independent project and is not affiliated with or endorsed by WhatsApp, Meta, Google, or Facebook. Product names and trademarks belong to their respective owners.

## Source files

| File | Purpose |
|---|---|
| `manifest.json` | Extension metadata, permissions, and script registration. |
| `popup.html` | Extension interface. |
| `popup.css` | Interface styling. |
| `popup.js` | Search settings, controls, exports, and script injection. |
| `content.js` | Google and Facebook result collection. |
| `wa_scraper.js` | WhatsApp Web member collection, local storage, and member export. |
| `icon16.png`, `icon48.png`, `icon128.png` | Extension icons. |

## Reporting problems

When reporting a problem, include your Chrome version, extension version, the affected tab, steps to reproduce, and the error message if available. Remove phone numbers, names, private group links, and message contents from screenshots or logs before sharing them.

## Reuse and licensing

No standalone `LICENSE` file is included in the supplied extension folder. This README does not assign an MIT license or another open-source license. Check the repository for any subsequently published license terms before redistribution, and request clarification from the creator when needed.

## Creator

Created by **Hazem El Shtry** with AI assistance.

For practical tutorials on automation, AI tools, and productivity, visit [Hazem El Shtry on YouTube](https://www.youtube.com/@HazemElShtry).
