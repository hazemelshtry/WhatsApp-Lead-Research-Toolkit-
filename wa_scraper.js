(async function () {
    'use strict';

    const DB_NAME = "whatsapp-members-storage-v4";
    const STORE_NAME = "members";
    const DB_VERSION = 1;

    let db = null;
    let observer = null;
    let scrollInterval = null;
    let isRunning = false;
    let endCheckCount = 0;
    let lastScrollHeight = 0;

    async function initDb() {
        db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = event => {
                const database = event.target.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function saveMember(member) {
        if (!db || !member?.id) return;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);

            const request = store.put(member);

            request.onsuccess = () => {
                updateCounter();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    async function getAllMembers() {
        if (!db) return [];

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);

            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async function clearMembers() {
        if (!db) return;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);

            const request = store.clear();

            request.onsuccess = () => {
                updateCounter();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    async function getCount() {
        if (!db) return 0;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);

            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function cleanText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function cleanName(value) {
        return cleanText(value)
            .replace(/^~+\s*/, "")
            .replace(/^Maybe\s+/i, "")
            .trim();
    }

    function isDefaultWhatsAppText(value) {
        const text = cleanText(value);

        return (
            /Hey there!\s*I am using WhatsApp\.?/i.test(text) ||
            /^I am using WhatsApp\.?$/i.test(text) ||
            /^Loading About\.?$/i.test(text) ||
            /^Available\.?$/i.test(text)
        );
    }

    function isUsername(value) {
        return /^@[A-Za-z0-9._]+$/i.test(cleanText(value));
    }

    function isPhone(value) {
        const text = cleanText(value);
        const digits = text.replace(/\D/g, "");

        return (
            /^[+\d][\d\s()+-]+$/.test(text) &&
            digits.length >= 7 &&
            digits.length <= 16
        );
    }

    function normalizePhone(phone) {
        return String(phone || "").replace(/\D/g, "");
    }

    function normalizeUsername(username) {
        return String(username || "")
            .trim()
            .replace(/^@/, "");
    }

    function getFirstName(name) {
        const cleaned = cleanName(name);

        if (
            !cleaned ||
            isDefaultWhatsAppText(cleaned) ||
            isUsername(cleaned) ||
            isPhone(cleaned)
        ) {
            return "";
        }

        const parts = cleaned.split(/\s+/);
        if (parts.length === 0) return "";

        const first = parts[0];
        const lowerFirst = first.toLowerCase().replace(/\.$/, '');
        
        // Common English and Arabic titles
        const titles = ['dr', 'eng', 'mr', 'mrs', 'ms', 'prof', 'engr', 'م', 'د', 'مهندس', 'دكتور', 'استاذ', 'أ'];

        if (titles.includes(lowerFirst) && parts.length > 1) {
            return first + " " + parts[1];
        }

        return first;
    }

    function personalizeMessage(template, firstName) {
        let message = String(template || "");

        const firstNamePattern =
            /["']?\bFirst\s*Name\b["']?/gi;

        if (firstName) {
            message = message.replace(
                firstNamePattern,
                firstName
            );
        } else {
            message = message.replace(
                firstNamePattern,
                ""
            );

            message = message
                .replace(/\s+,/g, ",")
                .replace(/,\s*,+/g, ",")
                .replace(/\s+([.!?])/g, "$1")
                .replace(/[ \t]{2,}/g, " ")
                .replace(/\n[ \t]+/g, "\n")
                .trim();
        }

        return message;
    }

    function buildWhatsAppLink(member, message) {
        const encodedMessage =
            encodeURIComponent(message || "");

        if (member.username) {
            const username =
                normalizeUsername(member.username);

            if (!username) return "";

            return encodedMessage
                ? `https://wa.me/${username}?text=${encodedMessage}`
                : `https://wa.me/${username}`;
        }

        if (member.phoneNumber) {
            const phone =
                normalizePhone(member.phoneNumber);

            if (!phone) return "";

            return encodedMessage
                ? `https://wa.me/${phone}?text=${encodedMessage}`
                : `https://wa.me/${phone}`;
        }

        return "";
    }

    function excelHyperlink(url, text = "Send Message") {
        if (!url) return "";

        const safeURL =
            String(url).replace(/"/g, '""');

        const safeText =
            String(text).replace(/"/g, '""');

        return `=HYPERLINK("${safeURL}","${safeText}")`;
    }

    function csvEscape(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        const string =
            String(value);

        return `"${string.replace(/"/g, '""')}"`;
    }

    function getGroupName() {
        const groupNameElement =
            document.querySelector(
                '[data-testid="group-info-drawer-subject-input-read-only selectable-text"]'
            );

        let groupName =
            groupNameElement
                ? cleanText(groupNameElement.textContent)
                : "";

        if (!groupName) {
            const ariaGroup =
                document.querySelector(
                    '[aria-label^="Group profile picture for"]'
                );

            const ariaLabel =
                ariaGroup?.getAttribute("aria-label") || "";

            const match =
                ariaLabel.match(
                    /Group profile picture for\s+"(.+?)"/i
                );

            if (match?.[1]) {
                groupName =
                    cleanText(match[1]);
            }
        }

        if (!groupName) {
            groupName =
                "WhatsApp-Members";
        }

        groupName =
            groupName
                .replace(/[\\/:*?"<>|]/g, "")
                .replace(/\.+$/g, "")
                .trim();

        return groupName || "WhatsApp-Members";
    }

    function extractMember(listItem) {
        if (!listItem) return null;

        if (
            listItem.querySelector(
                '[data-testid="section-header"]'
            )
        ) {
            return null;
        }

        const titleContainer =
            listItem.querySelector(
                '[data-testid="cell-frame-title"]'
            ) ||
            listItem.querySelector(
                'div[role="gridcell"][aria-colindex="2"]'
            );

        if (!titleContainer) return null;

        const candidates = [];
        const titleValues = [];

        titleContainer
            .querySelectorAll(
                'span[dir="auto"][title], span[dir="auto"]'
            )
            .forEach(el => {
                const value = cleanText(
                    el.getAttribute("title") ||
                    el.getAttribute("aria-label") ||
                    el.textContent
                );

                if (
                    value &&
                    !titleValues.includes(value)
                ) {
                    titleValues.push(value);
                }
            });

        listItem
            .querySelectorAll(
                'span[dir="auto"][title], span[dir="auto"][aria-label], span[dir="auto"]'
            )
            .forEach(el => {
                const value = cleanText(
                    el.getAttribute("title") ||
                    el.getAttribute("aria-label") ||
                    el.textContent
                );

                if (
                    value &&
                    !candidates.includes(value)
                ) {
                    candidates.push(value);
                }
            });

        let description = "";

        const secondary =
            listItem.querySelector(
                '[data-testid="cell-frame-secondary"]'
            );

        if (secondary) {
            const descElement =
                secondary.querySelector(
                    'span.copyable-text[title]'
                ) ||
                secondary.querySelector(
                    'span[data-testid="selectable-text"]'
                );

            if (descElement) {
                description = cleanText(
                    descElement.getAttribute("title") ||
                    descElement.textContent
                );

                if (
                    isDefaultWhatsAppText(description)
                ) {
                    description = "";
                }
            }
        }

        let username = "";
        let phoneNumber = "";
        let displayName = "";

        for (const value of titleValues) {
            if (!value) continue;

            if (
                !username &&
                isUsername(value)
            ) {
                username = value;
                continue;
            }

            if (
                !phoneNumber &&
                isPhone(value)
            ) {
                phoneNumber = value;
                continue;
            }

            if (
                /^Group admin$/i.test(value) ||
                /^Add member tag$/i.test(value) ||
                isDefaultWhatsAppText(value)
            ) {
                continue;
            }

            if (
                !displayName &&
                !isUsername(value) &&
                !isPhone(value)
            ) {
                displayName =
                    cleanName(value);
            }
        }

        for (const value of candidates) {
            if (!value) continue;

            if (
                !username &&
                isUsername(value)
            ) {
                username = value;
                continue;
            }

            if (
                !phoneNumber &&
                isPhone(value)
            ) {
                phoneNumber = value;
                continue;
            }

            if (
                /^Group admin$/i.test(value) ||
                /^Add member tag$/i.test(value) ||
                value === description ||
                isDefaultWhatsAppText(value)
            ) {
                continue;
            }

            if (
                !displayName &&
                !isUsername(value) &&
                !isPhone(value)
            ) {
                displayName =
                    cleanName(value);
            }
        }

        if (
            isUsername(displayName) ||
            isPhone(displayName) ||
            isDefaultWhatsAppText(displayName)
        ) {
            displayName = "";
        }

        let contact = "";
        let type = "";

        if (username) {
            contact = username;
            type = "Username";
        } else if (phoneNumber) {
            contact = phoneNumber;
            type = "Phone";
        }

        if (!contact) return null;

        let id = "";

        if (username) {
            id =
                "username:" +
                normalizeUsername(username)
                    .toLowerCase();
        } else {
            id =
                "phone:" +
                normalizePhone(phoneNumber);
        }

        return {
            id,
            contact,
            type,
            username,
            phoneNumber,
            displayName,
            description
        };
    }

    async function processListItem(item) {
        try {
            const member =
                extractMember(item);

            if (!member) return;

            await saveMember(member);

        } catch (error) {
            console.error(
                "Member error:",
                error
            );
        }
    }

    function getMembersModal() {
        return (
            document.querySelector(
                '[data-testid="contacts-modal"]'
            ) ||
            document.querySelector(
                '[data-animate-modal-body="true"]'
            )
        );
    }

    function getScrollableElement() {
        const modal =
            getMembersModal();

        if (!modal) return null;

        const elements =
            modal.querySelectorAll("div");

        let best = null;
        let biggestDifference = 0;

        for (const el of elements) {
            const style =
                window.getComputedStyle(el);

            const overflowY =
                style.overflowY;

            const difference =
                el.scrollHeight -
                el.clientHeight;

            if (
                difference > 100 &&
                (
                    overflowY === "auto" ||
                    overflowY === "scroll"
                )
            ) {
                if (
                    difference >
                    biggestDifference
                ) {
                    biggestDifference =
                        difference;

                    best = el;
                }
            }
        }

        return best;
    }

    function startScraping() {
        if (isRunning) return;

        const modal =
            getMembersModal();

        if (!modal) {
            alert(
                "Open the WhatsApp group members list first."
            );

            return;
        }

        isRunning = true;
        endCheckCount = 0;
        lastScrollHeight = 0;

        modal
            .querySelectorAll(
                '[role="listitem"]'
            )
            .forEach(
                item =>
                    processListItem(item)
            );

        observer =
            new MutationObserver(
                mutations => {
                    if (!isRunning) return;

                    for (
                        const mutation
                        of mutations
                    ) {
                        if (
                            mutation.type ===
                            "childList"
                        ) {
                            mutation.addedNodes
                                .forEach(node => {
                                    if (
                                        !(
                                            node instanceof
                                            Element
                                        )
                                    ) {
                                        return;
                                    }

                                    if (
                                        node.matches(
                                            '[role="listitem"]'
                                        )
                                    ) {
                                        processListItem(
                                            node
                                        );
                                    }

                                    node
                                        .querySelectorAll?.(
                                            '[role="listitem"]'
                                        )
                                        .forEach(
                                            processListItem
                                        );
                                });
                        }

                        if (
                            mutation.type ===
                            "attributes"
                        ) {
                            const element =
                                mutation.target;

                            if (
                                element instanceof
                                Element
                            ) {
                                const item =
                                    element.closest(
                                        '[role="listitem"]'
                                    );

                                if (item) {
                                    processListItem(
                                        item
                                    );
                                }
                            }
                        }
                    }
                }
            );

        observer.observe(
            modal,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "style",
                    "title"
                ]
            }
        );

        scrollInterval =
            setInterval(() => {
                if (!isRunning) return;

                const scroller =
                    getScrollableElement();

                if (!scroller) return;

                scroller
                    .querySelectorAll(
                        '[role="listitem"]'
                    )
                    .forEach(
                        processListItem
                    );

                const currentHeight =
                    scroller.scrollHeight;

                const atBottom =
                    scroller.scrollTop +
                        scroller.clientHeight >=
                    scroller.scrollHeight - 10;

                if (atBottom) {
                    if (
                        currentHeight ===
                        lastScrollHeight
                    ) {
                        endCheckCount++;
                    } else {
                        endCheckCount = 0;
                    }

                    lastScrollHeight =
                        currentHeight;

                    if (
                        endCheckCount >= 4
                    ) {
                        stopScraping();
                        return;
                    }
                } else {
                    endCheckCount = 0;
                    lastScrollHeight =
                        currentHeight;
                }

                scroller.scrollBy({
                    top:
                        Math.max(
                            400,
                            scroller.clientHeight *
                                0.8
                        ),
                    behavior: "smooth"
                });

            }, 1000);

        updateButtons();

        console.log(
            "WhatsApp scraper STARTED"
        );
    }

    function stopScraping() {
        isRunning = false;

        if (scrollInterval) {
            clearInterval(
                scrollInterval
            );

            scrollInterval = null;
        }

        if (observer) {
            observer.disconnect();

            observer = null;
        }

        updateButtons();

        console.log(
            "WhatsApp scraper STOPPED"
        );
    }

    async function downloadMembers() {
        const members =
            await getAllMembers();

        if (!members.length) {
            alert(
                "No members collected."
            );

            return;
        }

        let template = prompt(
`Enter your message template.

Use:

First Name

where you want the person's first name.

Example:

Hi First Name, I came across your profile and wanted to reach out.`
        );

        if (template === null) {
            return;
        }

        const addRef =
            confirm(
                "Add unique [Ref: XXXXX] to every message?"
            );

        const rows = [];

        rows.push([
            "Contact",
            "Type",
            "Username",
            "Phone Number",
            "Name",
            "First Name",
            "Description",
            "Send Message",
            "Message"
        ]);

        for (
            const member
            of members
        ) {
            const firstName =
                getFirstName(
                    member.displayName
                );

            let message =
                personalizeMessage(
                    template,
                    firstName
                );

            if (
                addRef &&
                message
            ) {
                const randomCode =
                    Math.random()
                        .toString(36)
                        .substring(2, 7)
                        .toUpperCase();

                message +=
                    `\n\n[Ref: ${randomCode}]`;
            }

            const messageURL =
                buildWhatsAppLink(
                    member,
                    message
                );

            const sendMessage =
                excelHyperlink(
                    messageURL,
                    "Send Message"
                );

            rows.push([
                member.contact || "",
                member.type || "",
                member.username || "",
                member.phoneNumber || "",
                member.displayName || "",
                firstName || "",
                member.description || "",
                sendMessage,
                message
            ]);
        }

        const csv =
            "\uFEFF" +
            rows
                .map(
                    row =>
                        row
                            .map(
                                csvEscape
                            )
                            .join(",")
                )
                .join("\n");

        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            `${getGroupName()}.csv`;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );
    }

    function createButton(
        text,
        background
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            text;

        button.style.cssText = `
            padding:7px 11px;
            border:none;
            border-radius:5px;
            cursor:pointer;
            color:#fff;
            font-size:13px;
            font-family:Arial,sans-serif;
            background:${background};
        `;

        return button;
    }

    let startButton;
    let stopButton;

    function updateButtons() {
        if (
            !startButton ||
            !stopButton
        ) {
            return;
        }

        if (isRunning) {
            startButton.disabled =
                true;

            startButton.style.opacity =
                "0.5";

            stopButton.disabled =
                false;

            stopButton.style.opacity =
                "1";
        } else {
            startButton.disabled =
                false;

            startButton.style.opacity =
                "1";

            stopButton.disabled =
                true;

            stopButton.style.opacity =
                "0.5";
        }
    }

    function setupUI() {
        document
            .getElementById(
                "wa-group-scraper-ui"
            )
            ?.remove();

        const container =
            document.createElement(
                "div"
            );

        container.id =
            "wa-group-scraper-ui";

        container.style.cssText = `
            position:fixed;
            right:20px;
            bottom:20px;
            z-index:9999999;
            display:flex;
            align-items:center;
            gap:6px;
            padding:10px 10px 10px 28px;
            border-radius:8px;
            background:#111b21;
            color:#fff;
            box-shadow:0 4px 20px rgba(0,0,0,.4);
            font-family:Arial,sans-serif;
            cursor:grab;
            user-select:none;
            transition: transform 0.05s linear;
        `;

        const grip = document.createElement("div");
        grip.innerHTML = "⋮⋮";
        grip.style.cssText = `
            position:absolute;
            left:8px;
            font-size:16px;
            color:#888;
            line-height:1;
        `;
        container.appendChild(grip);

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        container.addEventListener("mousedown", dragStart);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);

        function dragStart(e) {
            if (e.target.tagName.toLowerCase() !== 'button') {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
                container.style.cursor = 'grabbing';
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                container.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            container.style.cursor = 'grab';
        }

        const counter =
            document.createElement(
                "span"
            );

        counter.id =
            "wa-member-count";

        counter.textContent =
            "0";

        counter.style.cssText =
            "font-weight:bold;margin-right:3px;";

        const counterText =
            document.createElement(
                "span"
            );

        counterText.textContent =
            " members";

        startButton =
            createButton(
                "Start Scrolling",
                "#00a884"
            );

        startButton.onclick =
            startScraping;

        stopButton =
            createButton(
                "STOP",
                "#f44336"
            );

        stopButton.onclick =
            stopScraping;

        const downloadButton =
            createButton(
                "Download Members",
                "#2196f3"
            );

        downloadButton.onclick =
            downloadMembers;

        const resetButton =
            createButton(
                "Reset",
                "#777"
            );

        resetButton.onclick =
            async () => {
                const answer =
                    confirm(
                        "Delete all collected members?"
                    );

                if (!answer) return;

                await clearMembers();
            };

        container.append(
            counter,
            counterText,
            startButton,
            stopButton,
            downloadButton,
            resetButton
        );

        document.body.appendChild(
            container
        );

        updateButtons();
    }

    async function updateCounter() {
        const element =
            document.getElementById(
                "wa-member-count"
            );

        if (!element) return;

        element.textContent =
            await getCount();
    }

    await initDb();

    setupUI();

    await updateCounter();

})();
