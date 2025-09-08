document.addEventListener('DOMContentLoaded', () => {
    const heroPage = document.getElementById('hero-page');
    const mainAppPage = document.getElementById('main-app-page');
    const gotoAppButton = document.getElementById('goto-app-button');
    const navButtons = document.querySelectorAll('.app-nav__button');
    const uploadView = document.getElementById('upload-view');
    const imagesView = document.getElementById('images-view');
    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadError = document.getElementById('upload-error');
    const urlInput = document.getElementById('url-input');
    const copyBtn = document.getElementById('copy-btn');
    const imageList = document.getElementById('image-list');
    const imageItemTemplate = document.getElementById('image-item-template');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // API endpoints
    const API_UPLOAD = '/api/upload';
    const API_LIST = '/api/images';
    const IMG_BASE = '/images/';

    const heroImages = [
        '/static/assets/bird.png',
        '/static/assets/cat.png',
        '/static/assets/dog1.png',
        '/static/assets/dog2.png',
        '/static/assets/dog3.png',
    ];
    let uploadedImages = [];
    let db;

    // IndexedDB setup
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ImageUploaderDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('images')) {
                    const store = db.createObjectStore('images', { keyPath: 'id' });
                    store.createIndex('uploadDate', 'uploadDate', { unique: false });
                }
            };
        });
    }

    function setRandomHeroImage() {
        const randomIndex = Math.floor(Math.random() * heroImages.length);
        const randomImage = heroImages[randomIndex];
        heroPage.style.backgroundImage = `url(${randomImage})`;
    }

    gotoAppButton.addEventListener('click', () => {
        heroPage.classList.add('hidden');
        mainAppPage.classList.remove('hidden');
    });

    // Navigation logic
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.dataset.view;

            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (view === 'upload') {
                uploadView.classList.remove('hidden');
                imagesView.classList.add('hidden');
            } else {
                uploadView.classList.add('hidden');
                imagesView.classList.remove('hidden');
                // Refresh from server before rendering
                loadFromServerImages().then(() => renderImages());
            }
        });
    });

    // Upload logic
    function handleFileUpload(file) {
        urlInput.value = '';
        uploadError.classList.add('hidden');
        copyBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const form = new FormData();
                form.append('file', file);

                const response = await fetch(API_UPLOAD, {
                    method: 'POST',
                    body: form
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Upload failed');
                }

                const data = await response.json();
                const fileUrl = data.url || (IMG_BASE + (data.filename || file.name));
                const fileName = data.filename || file.name;

                urlInput.value = fileUrl;
                copyBtn.disabled = false;

                const imageData = {
                    id: Date.now(),
                    name: fileName,
                    url: fileUrl,
                    preview: e.target.result,
                    size: file.size,
                    type: file.type,
                    uploadDate: new Date().toISOString()
                };

                uploadedImages.unshift(imageData);
                saveToStorage(imageData);
                showUploadSuccess();
            } catch (err) {
                uploadError.textContent = err.message || 'Upload failed. Please try again.';
                uploadError.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }

    function showUploadSuccess() {
        const successMessage = document.createElement('div');
        successMessage.className = 'upload-success';
        successMessage.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Image uploaded successfully!</span>
        `;
        successMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    }

    browseBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                uploadError.textContent = 'Only .jpg, .png and .gif files are supported';
                uploadError.classList.remove('hidden');
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                uploadError.textContent = 'Maximum file size is 5MB';
                uploadError.classList.remove('hidden');
                return;
            }
            
            handleFileUpload(file);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });

    copyBtn.addEventListener('click', () => {
        if (urlInput.value) {
            navigator.clipboard.writeText(urlInput.value).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'COPIED!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            });
        }
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    function renderImages() {
        imageList.innerHTML = '';
        
        if (uploadedImages.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'empty-state';
            emptyMessage.innerHTML = `
                <i class="fas fa-images"></i>
                <h3>No images uploaded yet</h3>
                <p>Upload your first image to see it here</p>
            `;
            imageList.appendChild(emptyMessage);
            return;
        }
        
        uploadedImages.forEach(image => {
            const template = imageItemTemplate.content.cloneNode(true);
            const item = template.querySelector('.image-item');
            
            item.dataset.id = image.id;
            
            // Update the template structure to include preview and metadata
            const nameElement = item.querySelector('.image-item__name');
            nameElement.innerHTML = `
                <div class="image-preview">
                    <img src="${image.preview || image.url}" alt="${image.name}" class="preview-thumbnail">
                </div>
                <div class="image-info">
                    <span class="image-name">${image.name}</span>
                    <span class="image-meta">${(image.size ? formatFileSize(image.size) : '')}${(image.size && image.uploadDate) ? ' • ' : ''}${(image.uploadDate ? formatDate(image.uploadDate) : '')}</span>
                </div>
            `;
            
            const urlLink = item.querySelector('.image-item__url a');
            urlLink.href = image.url;
            urlLink.textContent = image.url;
            
            // Bind delete button event
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteImage(image.id);
            });
            
            imageList.appendChild(template);
        });
    }

    function deleteImage(imageId) {
        if (confirm('Are you sure you want to delete this image?')) {
            uploadedImages = uploadedImages.filter(img => img.id !== imageId);
            deleteFromStorage(imageId);
            renderImages();
        }
    }

    // Enhanced storage functions
    async function saveToStorage(imageData) {
        // Save to localStorage as backup
        try {
            localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }

        // Save to IndexedDB for better persistence
        try {
            if (db) {
                const transaction = db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                await store.put(imageData);
            }
        } catch (e) {
            console.warn('IndexedDB save failed:', e);
        }
    }

    async function deleteFromStorage(imageId) {
        // Delete from localStorage
        try {
            localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
        } catch (e) {
            console.warn('localStorage delete failed:', e);
        }

        // Delete from IndexedDB
        try {
            if (db) {
                const transaction = db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                await store.delete(imageId);
            }
        } catch (e) {
            console.warn('IndexedDB delete failed:', e);
        }
    }

    async function loadFromStorage() {
        let loadedImages = [];
        console.log('Loading images from storage...');

        // Try to load from IndexedDB first
        try {
            if (db) {
                console.log('Trying to load from IndexedDB...');
                const transaction = db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.getAll();
                
                const images = await new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        console.log('IndexedDB images loaded:', request.result);
                        resolve(request.result);
                    };
                    request.onerror = () => {
                        console.error('IndexedDB load error:', request.error);
                        reject(request.error);
                    };
                });
                
                loadedImages = images.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                console.log('Images sorted from IndexedDB:', loadedImages.length);
            } else {
                console.log('IndexedDB not available');
            }
        } catch (e) {
            console.warn('IndexedDB load failed:', e);
        }

        // If IndexedDB is empty, try localStorage as fallback
        if (loadedImages.length === 0) {
            console.log('Trying localStorage as fallback...');
            try {
                const saved = localStorage.getItem('uploadedImages');
                console.log('localStorage data:', saved);
                if (saved) {
                    loadedImages = JSON.parse(saved);
                    console.log('Images loaded from localStorage:', loadedImages.length);
                }
            } catch (e) {
                console.warn('localStorage load failed:', e);
            }
        }

        uploadedImages = loadedImages;
        console.log('Final uploadedImages array:', uploadedImages);
        
        // Force render if we're on images view
        if (!imagesView.classList.contains('hidden')) {
            renderImages();
        }
    }

    // Load image list from server and merge with local list
    async function loadFromServerImages() {
        try {
            const response = await fetch(API_LIST, { method: 'GET' });
            if (!response.ok) {
                return; // silently ignore; server might not be ready
            }
            const files = await response.json(); // expects ["file1.jpg", ...]
            const serverImages = (Array.isArray(files) ? files : []).map(name => ({
                id: `srv-${name}`,
                name,
                url: IMG_BASE + name,
                preview: IMG_BASE + name
            }));

            // Merge without duplicates (by url)
            const existingByUrl = new Set(uploadedImages.map(i => i.url));
            const merged = [
                ...serverImages.filter(i => !existingByUrl.has(i.url)),
                ...uploadedImages
            ];
            uploadedImages = merged;
        } catch (e) {
            // ignore fetch errors in UI
        }
    }

    async function clearAllImages() {
        if (confirm('Are you sure you want to delete all images? This action cannot be undone.')) {
            uploadedImages = [];
            
            // Clear localStorage
            try {
                localStorage.removeItem('uploadedImages');
                console.log('localStorage cleared');
            } catch (e) {
                console.warn('localStorage clear failed:', e);
            }

            // Clear IndexedDB
            try {
                if (db) {
                    const transaction = db.transaction(['images'], 'readwrite');
                    const store = transaction.objectStore('images');
                    await store.clear();
                    console.log('IndexedDB cleared');
                }
            } catch (e) {
                console.warn('IndexedDB clear failed:', e);
            }

            renderImages();
        }
    }

    // Event listeners
    clearAllBtn.addEventListener('click', clearAllImages);

    // Initialize
    async function initialize() {
        setRandomHeroImage();
        await initDB();
        await loadFromStorage();
        await loadFromServerImages();
    }

    initialize();
});
