document.addEventListener('DOMContentLoaded', () => {
    // Tab Elements
    const navSearch = document.getElementById('nav-search');
    const navWeb = document.getElementById('nav-web');
    const tabSearch = document.getElementById('tab-search');
    const tabWeb = document.getElementById('tab-web');
    const btnInjectWa = document.getElementById('btn-inject-wa');

    // Platform Toggle
    const platGoogle = document.getElementById('plat-google');
    const platFacebook = document.getElementById('plat-facebook');
    const targetSiteGroup = document.getElementById('target-site-group');
    const pagesLabel = document.getElementById('pages-label');
    
    // UI Elements
    const typeContact = document.getElementById('type-contact');
    const typeGroup = document.getElementById('type-group');
    const targetWebsite = document.getElementById('target-website');
    const countryCodeGroup = document.getElementById('country-code-group');
    const countryCodeInput = document.getElementById('country-code');
    const keywordInput = document.getElementById('keyword');
    const locationInput = document.getElementById('location');
    const pageMinus = document.getElementById('page-minus');
    const pagePlus = document.getElementById('page-plus');
    const searchPages = document.getElementById('search-pages');
    const btnSearch = document.getElementById('btn-search');
    const btnResume = document.getElementById('btn-resume');
    const btnStop = document.getElementById('btn-stop');
    
    // Result Elements
    const resultCount = document.getElementById('result-count');
    const statusCollecting = document.getElementById('status-collecting');
    const pageProgress = document.getElementById('page-progress');
    const resultText = document.getElementById('result-text');
    const addWebsiteBtn = document.getElementById('add-website');
    
    const btnCopy = document.getElementById('btn-copy');
    const btnExport = document.getElementById('btn-export');
    const btnExportTxt = document.getElementById('btn-export-txt');
    const btnOpenLinks = document.getElementById('btn-open-links');
    const btnClear = document.getElementById('btn-clear');

    let currentPlatform = 'Google';
    let currentType = 'Group';

    // Load State
    chrome.storage.local.get(['uiState', 'scrapeTask'], (data) => {
        if (data.uiState) {
            if (data.uiState.platform === 'Facebook') {
                currentPlatform = 'Facebook';
                platFacebook.classList.add('fb-active');
                platGoogle.classList.remove('google-active');
                targetSiteGroup.classList.add('hidden');
            } else {
                currentPlatform = 'Google';
                platGoogle.classList.add('google-active');
                platFacebook.classList.remove('fb-active');
                targetSiteGroup.classList.remove('hidden');
            }
            
            if (data.uiState.type === 'Contact') {
                currentType = 'Contact';
                typeContact.classList.add('contact-active'); 
                typeGroup.classList.remove('group-active');
                countryCodeGroup.classList.remove('hidden');
            } else {
                currentType = 'Group';
                typeGroup.classList.add('group-active'); 
                typeContact.classList.remove('contact-active');
                countryCodeGroup.classList.add('hidden');
            }
            
            if (data.uiState.site) {
                let exists = Array.from(targetWebsite.options).some(opt => opt.value === data.uiState.site);
                if (!exists) {
                    const option = document.createElement('option');
                    option.value = data.uiState.site;
                    option.textContent = data.uiState.site;
                    targetWebsite.appendChild(option);
                }
                targetWebsite.value = data.uiState.site;
            }
            if (data.uiState.countryCode) countryCodeInput.value = data.uiState.countryCode;
            if (data.uiState.keyword) keywordInput.value = data.uiState.keyword;
            if (data.uiState.location) locationInput.value = data.uiState.location;
            if (data.uiState.pages) searchPages.value = data.uiState.pages;
        } else {
            platGoogle.classList.add('google-active');
            typeGroup.classList.add('group-active');
        }
        if (data.scrapeTask) {
            updateResultsUI(data.scrapeTask);
        }
    });

    function saveUI() {
        chrome.storage.local.set({
            uiState: {
                platform: currentPlatform,
                type: currentType,
                site: targetWebsite.value,
                countryCode: countryCodeInput.value,
                keyword: keywordInput.value,
                location: locationInput.value,
                pages: searchPages.value
            }
        });
    }

    // Platform listeners
    platGoogle.addEventListener('click', () => { 
        currentPlatform = 'Google'; 
        platGoogle.classList.add('google-active'); 
        platFacebook.classList.remove('fb-active'); 
        targetSiteGroup.classList.remove('hidden');
        saveUI(); 
    });
    platFacebook.addEventListener('click', () => { 
        currentPlatform = 'Facebook'; 
        platFacebook.classList.add('fb-active'); 
        platGoogle.classList.remove('google-active'); 
        targetSiteGroup.classList.add('hidden');
        saveUI(); 
    });

    // Type listeners
    typeContact.addEventListener('click', () => { 
        currentType = 'Contact'; 
        typeContact.classList.add('contact-active'); 
        typeGroup.classList.remove('group-active');
        countryCodeGroup.classList.remove('hidden');
        saveUI(); 
    });
    typeGroup.addEventListener('click', () => { 
        currentType = 'Group'; 
        typeGroup.classList.add('group-active'); 
        typeContact.classList.remove('contact-active');
        countryCodeGroup.classList.add('hidden');
        saveUI(); 
    });
    
    targetWebsite.addEventListener('change', saveUI);
    countryCodeInput.addEventListener('change', saveUI);
    keywordInput.addEventListener('input', saveUI);
    locationInput.addEventListener('input', saveUI);
    
    pageMinus.addEventListener('click', () => { let val = parseInt(searchPages.value) || 1; if (val > 1) searchPages.value = val - 1; saveUI(); });
    pagePlus.addEventListener('click', () => { let val = parseInt(searchPages.value) || 1; searchPages.value = val + 1; saveUI(); });
    searchPages.addEventListener('input', saveUI);

    addWebsiteBtn.addEventListener('click', () => {
        let newSite = prompt("Enter custom website URL (e.g., www.reddit.com):");
        if (newSite) {
            newSite = newSite.replace('https://', '').replace('http://', '').trim();
            const option = document.createElement('option');
            option.value = newSite;
            option.textContent = newSite;
            targetWebsite.appendChild(option);
            targetWebsite.value = newSite;
            saveUI();
        }
    });

    // Tab Navigation
    navSearch.addEventListener('click', () => {
        navSearch.classList.add('active');
        navWeb.classList.remove('active');
        tabSearch.classList.add('active');
        tabWeb.classList.remove('active');
    });

    navWeb.addEventListener('click', () => {
        navWeb.classList.add('active');
        navSearch.classList.remove('active');
        tabWeb.classList.add('active');
        tabSearch.classList.remove('active');
    });

    // Inject WA Scraper
    btnInjectWa.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            const currentUrl = tabs[0].url || '';
            if (!currentUrl.includes('web.whatsapp.com')) {
                alert('Please open web.whatsapp.com first, then try again!');
                return;
            }
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['wa_scraper.js']
            });
            window.close(); // Close popup after injecting
        });
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.scrapeTask && changes.scrapeTask.newValue) {
            updateResultsUI(changes.scrapeTask.newValue);
        }
    });

    function updateResultsUI(task) {
        if (task.results) {
            resultCount.textContent = task.results.length;
            resultText.value = task.results.join('\n');
            resultText.scrollTop = resultText.scrollHeight;
            if (task.totalPages > 0) {
                pageProgress.textContent = `(${task.currentPage}/${task.totalPages})`;
            }
        }
        
        if (task.active) {
            statusCollecting.classList.remove('hidden');
            
            btnSearch.classList.remove('hidden');
            btnSearch.classList.add('running');
            btnSearch.querySelector('.btn-text').textContent = 'Searching...';
            
            btnResume.classList.add('hidden');
            btnStop.classList.remove('stopped');
        } else {
            statusCollecting.classList.add('hidden');
            
            btnSearch.classList.remove('hidden');
            btnSearch.classList.remove('running');
            btnSearch.querySelector('.btn-text').textContent = 'Start Search';
            
            if (task.currentPage > 0 && task.currentPage < task.totalPages) {
                btnResume.classList.remove('hidden');
                btnStop.classList.add('stopped');
            } else {
                btnResume.classList.add('hidden');
                btnStop.classList.remove('stopped');
            }
        }
    }

    btnSearch.addEventListener('click', () => {
        saveUI();
        const keyword = keywordInput.value.trim();
        const loc = locationInput.value.trim();
        const pages = parseInt(searchPages.value) || 1;
        let cCode = countryCodeInput.value;
        
        let query = '';
        let searchUrl = '';
        let baseLinkFilter = currentType === 'Group' ? 'chat.whatsapp.com' : 'https://wa.me';
        
        if (currentPlatform === 'Facebook') {
            // Facebook Query Format
            let parts = [baseLinkFilter];
            if (keyword) parts.push(keyword);
            if (loc) parts.push(loc);
            query = parts.join(', ');
            searchUrl = `https://www.facebook.com/search/top/?q=${encodeURIComponent(query)}`;
        } else {
            // Google Query Format
            const site = targetWebsite.value;
            query = `site:${site}`;
            if (keyword) query += ` ${keyword}`;
            if (loc) query += ` ${loc}`;
            query += ` "${baseLinkFilter}"`; 
            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&start=0&pws=0&hl=en`;
        }

        const task = {
            active: true,
            platform: currentPlatform,
            query: query,
            totalPages: pages,
            currentPage: 0,
            results: [],
            linkFilter: currentType === 'Group' ? 'chat.whatsapp.com' : 'wa.me',
            countryCode: currentType === 'Contact' ? cCode : '',
            searchUrl: searchUrl
        };

        chrome.storage.local.set({ scrapeTask: task }, () => {
            updateResultsUI(task);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length > 0) {
                    let currentUrl = tabs[0].url || '';
                    if (currentPlatform === 'Facebook' && currentUrl.includes('facebook.com/search/')) {
                        try {
                            // Parse current URL to keep filters (like Tagged Location) but update the search query
                            let urlObj = new URL(currentUrl);
                            urlObj.searchParams.set('q', query);
                            chrome.tabs.update(tabs[0].id, {url: urlObj.toString()});
                        } catch (e) {
                            chrome.tabs.update(tabs[0].id, {url: searchUrl});
                        }
                    } else {
                        chrome.tabs.update(tabs[0].id, {url: searchUrl});
                    }
                } else {
                    chrome.tabs.create({ url: searchUrl, active: true });
                }
            });
        });
    });

    btnResume.addEventListener('click', () => {
        chrome.storage.local.get(['scrapeTask'], (data) => {
            if (data.scrapeTask && !data.scrapeTask.active && data.scrapeTask.currentPage < data.scrapeTask.totalPages) {
                // Update task with the currently selected UI settings before resuming
                data.scrapeTask.active = true;
                data.scrapeTask.linkFilter = currentType === 'Group' ? 'chat.whatsapp.com' : 'wa.me';
                data.scrapeTask.countryCode = currentType === 'Contact' ? countryCodeInput.value : '';

                chrome.storage.local.set({ scrapeTask: data.scrapeTask }, () => {
                    updateResultsUI(data.scrapeTask);
                    
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        if (tabs.length > 0) {
                            if (data.scrapeTask.platform === 'Google') {
                                let nextStart = data.scrapeTask.currentPage * 10;
                                let nextUrl = `https://www.google.com/search?q=${encodeURIComponent(data.scrapeTask.query)}&num=10&start=${nextStart}&pws=0&hl=en`;
                                chrome.tabs.update(tabs[0].id, {url: nextUrl});
                            } else {
                                // For Facebook, just send a message to resume without reloading the page
                                chrome.tabs.sendMessage(tabs[0].id, { action: 'resume_scrape' }).catch(err => {
                                    // If message fails (e.g. user is on a different tab without content.js), fallback to navigating
                                    chrome.tabs.update(tabs[0].id, {url: data.scrapeTask.searchUrl});
                                });
                            }
                        } else {
                            // Fallback if no active tab
                            chrome.tabs.create({ url: data.scrapeTask.searchUrl, active: true });
                        }
                    });
                });
            }
        });
    });

    btnStop.addEventListener('click', () => {
        chrome.storage.local.get(['scrapeTask'], (data) => {
            if (data.scrapeTask) {
                if (!data.scrapeTask.active && data.scrapeTask.currentPage > 0 && data.scrapeTask.currentPage < data.scrapeTask.totalPages) {
                    // Double stop: user wants to completely stop the paused task
                    data.scrapeTask.currentPage = data.scrapeTask.totalPages;
                } else {
                    // First stop: pause the task
                    data.scrapeTask.active = false;
                }
                
                chrome.storage.local.set({ scrapeTask: data.scrapeTask }, () => {
                    updateResultsUI(data.scrapeTask);
                });
            }
        });
    });

    btnCopy.addEventListener('click', () => {
        if (!resultText.value) return;
        resultText.select();
        document.execCommand('copy');
        let textSpan = btnCopy.querySelector('.btn-text');
        let old = textSpan.textContent;
        textSpan.textContent = 'Copied!';
        setTimeout(() => textSpan.textContent = old, 1500);
    });

    btnExport.addEventListener('click', () => {
        if (!resultText.value) return;
        const blob = new Blob([resultText.value], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whatsapp_links.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    btnExportTxt.addEventListener('click', () => {
        if (!resultText.value) return;
        const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whatsapp_links.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    btnOpenLinks.addEventListener('click', () => {
        chrome.storage.local.get(['scrapeTask'], (data) => {
            if (data.scrapeTask && data.scrapeTask.results && data.scrapeTask.results.length > 0) {
                let links = data.scrapeTask.results;
                if (links.length > 15) {
                    if (!confirm(`You are about to open ${links.length} tabs. Are you sure? This might slow down your browser.`)) {
                        return;
                    }
                }
                links.forEach(link => {
                    chrome.tabs.create({ url: link, active: false });
                });
            } else {
                alert('No links to open!');
            }
        });
    });

    btnClear.addEventListener('click', () => {
        chrome.storage.local.get(['scrapeTask'], (data) => {
            if (data.scrapeTask) {
                data.scrapeTask.results = [];
                data.scrapeTask.active = false;
                data.scrapeTask.currentPage = 0;
                chrome.storage.local.set({ scrapeTask: data.scrapeTask }, () => {
                    updateResultsUI(data.scrapeTask);
                });
                resultText.value = '';
                resultCount.textContent = '0';
                pageProgress.textContent = '';
            }
        });
    });
});
