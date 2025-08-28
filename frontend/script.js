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
    const imagesTableBody = document.getElementById('images-table-body');
    const imageRowTemplate = document.getElementById('image-row-template');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const emptyState = document.querySelector('.empty-state');

    const heroImages = [
        'assets/images/bird.png',
        'assets/images/cat.png',
        'assets/images/dog1.png',
        'assets/images/dog2.png',
        'assets/images/dog3.png',
    ];
    let uploadedImages = [];

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
                renderImages();
            }
        });
    });

    // Upload logic
    function handleFileUpload(file) {
        urlInput.value = '';
        uploadError.classList.add('hidden');
        copyBtn.disabled = true;
        
        setTimeout(() => {
            if (Math.random() < 0.8) {
                const fakeUrl = `https://sharefile.xyz/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
                urlInput.value = fakeUrl;
                copyBtn.disabled = false;
                
                const imageData = {
                    id: Date.now(),
                    name: file.name,
                    url: fakeUrl
                };
                uploadedImages.push(imageData);
                saveToLocalStorage();
            } else {
                uploadError.classList.remove('hidden');
            }
        }, 2000);
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

    function renderImages() {
        imagesTableBody.innerHTML = '';
        
        if (uploadedImages.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        uploadedImages.forEach(image => {
            const template = imageRowTemplate.content.cloneNode(true);
            const row = template.querySelector('.image-row');
            
            row.dataset.id = image.id;
            row.querySelector('.file-name').textContent = image.name;
            const urlLink = row.querySelector('.file-url');
            urlLink.href = image.url;
            urlLink.textContent = image.url;
            
            // Bind checkbox event
            const checkbox = row.querySelector('.image-checkbox');
            checkbox.addEventListener('change', (e) => {
                updateSelectAllState();
            });
            
            // Bind delete button event
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteImage(image.id);
            });
            
            imagesTableBody.appendChild(template);
        });
        
        updateSelectAllState();
    }

    function updateSelectAllState() {
        const checkboxes = imagesTableBody.querySelectorAll('.image-checkbox');
        const checkedCheckboxes = imagesTableBody.querySelectorAll('.image-checkbox:checked');
        
        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === checkboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = imagesTableBody.querySelectorAll('.image-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    function deleteImage(imageId) {
        if (confirm('Are you sure you want to delete this image?')) {
            uploadedImages = uploadedImages.filter(img => img.id !== imageId);
            renderImages();
            saveToLocalStorage();
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('uploadedImages');
        if (saved) {
            uploadedImages = JSON.parse(saved);
        }
    }

    // Initialize
    setRandomHeroImage();
    loadFromLocalStorage();
});
