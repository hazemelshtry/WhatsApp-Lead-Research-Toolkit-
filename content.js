chrome.storage.local.get(['scrapeTask'], (data) => {
    if (!data.scrapeTask || !data.scrapeTask.active) {
        return; 
    }

    const task = data.scrapeTask;

    if (task.platform === 'Facebook') {
        executeFacebookScrape();
    } else {
        executeGoogleScrape();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'resume_scrape' || request.action === 'start_scrape') {
        chrome.storage.local.get(['scrapeTask'], (data) => {
            if (data.scrapeTask && data.scrapeTask.active) {
                if (data.scrapeTask.platform === 'Facebook') {
                    executeFacebookScrape();
                } else {
                    executeGoogleScrape();
                }
            }
        });
    }
});

function executeFacebookScrape() {
    let delay = Math.floor(Math.random() * 2000) + 2500; // Facebook needs slightly longer wait for posts to render

    setTimeout(() => {
        chrome.storage.local.get(['scrapeTask'], (latestData) => {
            if (!latestData.scrapeTask || !latestData.scrapeTask.active) {
                return;
            }
            
            let currentTask = latestData.scrapeTask;
            let filterString = currentTask.linkFilter || 'chat.whatsapp.com';
            
            // Auto-click "See more" or "عرض المزيد" to reveal hidden links in long posts
            let buttons = document.querySelectorAll('div[role="button"]');
            let clicked = false;
            buttons.forEach(btn => {
                let text = btn.innerText || btn.textContent;
                if (text && (text.trim() === 'See more' || text.trim() === 'عرض المزيد')) {
                    try {
                        btn.click();
                        clicked = true;
                    } catch (e) {}
                }
            });

            // Wait briefly if we clicked something, to let React expand the DOM
            setTimeout(() => {
                let foundLinks = extractLinks(filterString, currentTask.countryCode);

                let combinedLinks = [...new Set([...currentTask.results, ...foundLinks])];
                currentTask.results = combinedLinks;
                currentTask.currentPage++;

                chrome.storage.local.set({ scrapeTask: currentTask }, () => {
                    if (currentTask.currentPage < currentTask.totalPages) {
                        // Scroll down to load more Facebook posts
                        window.scrollTo(0, document.body.scrollHeight);
                        
                        // Recursive call to loop within the same page instance
                        executeFacebookScrape();
                    } else {
                        currentTask.active = false;
                        chrome.storage.local.set({ scrapeTask: currentTask });
                    }
                });
            }, clicked ? 1000 : 0);
        });
    }, delay);
}

function extractLinks(filterString, countryCode) {
    let htmlContent = document.body.innerHTML;
    let textContent = document.body.innerText || "";
    let cleanHtml = htmlContent.replace(/<[^>]*>/g, ''); // Strip all HTML tags (fixes Google <em> tags breaking URLs)
    
    let combinedText = htmlContent + " \n " + textContent + " \n " + cleanHtml;
    let foundLinks = [];

    if (filterString === 'wa.me') {
        let pattern = countryCode 
            ? `(?:https?:\\/\\/)?(?:www\\.)?wa\\s*\\.\\s*me\\s*\\/\\s*\\+?${countryCode}[\\s\\-0-9]+`
            : `(?:https?:\\/\\/)?(?:www\\.)?wa\\s*\\.\\s*me\\s*\\/\\s*\\+?[0-9][\\s\\-0-9]+`;
        let regex = new RegExp(pattern, 'gi');
        foundLinks = combinedText.match(regex) || [];
    } else {
        let regex = /(?:https?:\/\/)?(?:www\.)?chat\s*\.\s*whatsapp\s*\.\s*com\s*\/\s*[a-zA-Z0-9_-]+/gi;
        foundLinks = combinedText.match(regex) || [];
    }

    return foundLinks.map(link => {
        let clean = link.replace(/\s+/g, ''); // Remove spaces
        if (!/^https?:\/\//i.test(clean)) {
            clean = 'https://' + clean;
        }
        // If it extracted Https:// we can also normalize it to lowercase
        clean = clean.replace(/^https?:\/\//i, 'https://');
        return clean;
    });
}

function executeGoogleScrape() {
    let delay = Math.floor(Math.random() * 1500) + 2000;

    setTimeout(() => {
        chrome.storage.local.get(['scrapeTask'], (latestData) => {
            if (!latestData.scrapeTask || !latestData.scrapeTask.active) {
                return; 
            }
            
            let task = latestData.scrapeTask;
            let filterString = task.linkFilter || 'chat.whatsapp.com';
            
            let foundLinks = extractLinks(filterString, task.countryCode);

            let combinedLinks = [...new Set([...task.results, ...foundLinks])];
            task.results = combinedLinks;
            task.currentPage++;

            chrome.storage.local.set({ scrapeTask: task }, () => {
                if (task.currentPage < task.totalPages) {
                    let nextStart = task.currentPage * 10;
                    // Because it's Google, we need to navigate the URL to next page
                    let nextUrl = `https://www.google.com/search?q=${encodeURIComponent(task.query)}&num=10&start=${nextStart}&pws=0&hl=en`;
                    window.location.href = nextUrl;
                } else {
                    task.active = false;
                    chrome.storage.local.set({ scrapeTask: task });
                }
            });
        });
    }, delay);
}
