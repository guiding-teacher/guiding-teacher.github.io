
document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // 1. STATE MANAGEMENT & CONSTANTS
    // =================================================================================
    let nav = 0;
    let events = [];
    let posts = [];
    let categories = [];
    let selectedDay = null;
    let currentCategoryFilter = 'all';

    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    const colors = [
        { id: 'blue', hex: '#3b82f6' }, { id: 'red', hex: '#ef4444' },
        { id: 'green', hex: '#10b981' }, { id: 'yellow', hex: '#f59e0b' },
        { id: 'purple', hex: '#8b5cf6' }, { id: 'pink', hex: '#ec4899' },
        { id: 'indigo', hex: '#6366f1' }, { id: 'orange', hex: '#f97316' }
    ];

    // =================================================================================
    // 2. DOM ELEMENT SELECTORS
    // =================================================================================
    const calendar = document.getElementById('calendar-grid');
    const currentMonthYear = document.getElementById('current-month-year');
    const searchInput = document.getElementById('search-input');
    
    const eventModal = document.getElementById('event-modal');
    const postModal = document.getElementById('post-modal');
    const datePickerModal = document.getElementById('date-picker-modal');

    // =================================================================================
    // 3. DATA STORAGE (LOCALSTORAGE)
    // =================================================================================
    const Store = {
        getData: () => {
            const dataString = localStorage.getItem('nadh_m_data');
            if (dataString) {
                const data = JSON.parse(dataString);
                // Ensure dates are converted back to Date objects
                data.events.forEach(event => event.date = new Date(event.date));
                return data;
            }
            // Default data structure if nothing is stored
            return {
                events: [],
                posts: [],
                categories: [
                    { id: 'meeting', name: 'اجتماع' }, { id: 'birthday', name: 'عيد ميلاد' },
                    { id: 'appointment', name: 'موعد' }, { id: 'task', name: 'مهمة' },
                    { id: 'note', name: 'ملاحظة' }
                ]
            };
        },
        saveData: () => {
            const data = { events, posts, categories };
            localStorage.setItem('nadh_m_data', JSON.stringify(data));
        },
        getTheme: () => localStorage.getItem('theme') || 'light',
        setTheme: (theme) => localStorage.setItem('theme', theme)
    };
    
    // =================================================================================
    // 4. UI RENDERING FUNCTIONS
    // =================================================================================

    function renderCalendar() {
        const dt = new Date();
        if (nav !== 0) dt.setMonth(new Date().getMonth() + nav);
        
        const day = dt.getDate();
        const month = dt.getMonth();
        const year = dt.getFullYear();

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dateString = firstDayOfMonth.toLocaleDateString('ar-EG', { weekday: 'long' });
        const paddingDays = weekdays.indexOf(dateString);
        
        currentMonthYear.innerText = `${months[month]} ${year}`;
        calendar.innerHTML = '';
        
        const searchTerm = searchInput.value.toLowerCase();

        for (let i = 1; i <= paddingDays + daysInMonth; i++) {
            const daySquare = document.createElement('div');
            daySquare.classList.add('calendar-day');
            
            if (i > paddingDays) {
                const dayOfMonth = i - paddingDays;
                const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
                daySquare.innerHTML = `<div class="day-number">${dayOfMonth}</div><div class="day-events"></div>`;

                let dayEvents = events.filter(e => e.date.toISOString().split('T')[0] === dayString);
                
                // Apply filters
                if (currentCategoryFilter !== 'all') {
                    dayEvents = dayEvents.filter(e => e.category === currentCategoryFilter);
                }
                if (searchTerm) {
                    dayEvents = dayEvents.filter(e => 
                        e.title.toLowerCase().includes(searchTerm) || 
                        (e.description && e.description.toLowerCase().includes(searchTerm))
                    );
                }
                
                if (dayEvents.length > 0) {
                    const eventsContainer = daySquare.querySelector('.day-events');
                    dayEvents.slice(0, 2).forEach(event => {
                        const eventPill = document.createElement('div');
                        eventPill.classList.add('event-pill');
                        eventPill.innerText = event.title;
                        const colorInfo = colors.find(c => c.hex === event.color);
                        eventPill.style.backgroundColor = colorInfo ? colorInfo.hex : '#3b82f6';
                        eventsContainer.appendChild(eventPill);
                    });

                    if (dayEvents.length > 2) {
                        const moreEvents = document.createElement('div');
                        moreEvents.classList.add('more-events');
                        moreEvents.innerText = `+${dayEvents.length - 2} أكثر`;
                        daySquare.appendChild(moreEvents);
                    }
                }

                if (dayOfMonth === day && nav === 0) daySquare.classList.add('today');
                if (dayString === selectedDay) daySquare.classList.add('selected');

                daySquare.addEventListener('click', () => handleDayClick(dayString));
            } else {
                daySquare.classList.add('not-current-month');
            }
            calendar.appendChild(daySquare);
        }
    }

    function renderDailyDetails(dateString) {
        selectedDay = dateString;
        const date = new Date(dateString);
        
        document.getElementById('daily-details-header').innerText = `تفاصيل يوم: ${date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}`;
        
        const list = document.getElementById('daily-events-list');
        list.innerHTML = '';
        
        const dayEvents = events.filter(e => e.date.toISOString().split('T')[0] === dateString)
                                .sort((a, b) => a.date - b.date);

        if (dayEvents.length === 0) {
            list.innerHTML = '<p>لا توجد أحداث في هذا اليوم.</p>';
        } else {
            dayEvents.forEach(event => {
                const item = document.createElement('div');
                item.classList.add('event-detail-item');
                const colorInfo = colors.find(c => c.hex === event.color);
                item.style.borderRightColor = colorInfo ? colorInfo.hex : '#3b82f6';

                item.innerHTML = `
                    <div class="event-info">
                        <span class="title">${event.title}</span>
                        <span class="time">${event.date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="event-actions">
                        <button class="edit-btn" data-id="${event.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${event.id}" title="حذف"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                list.appendChild(item);
            });
            list.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModalById(btn.dataset.id)));
            list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => handleDeleteEvent(btn.dataset.id)));
        }
    }

    function renderUpcomingEvents() {
        const list = document.getElementById('upcoming-events-list');
        list.innerHTML = '';
        const now = new Date();
        
        let upcoming = events.filter(e => e.date > now);
        if (currentCategoryFilter !== 'all') {
            upcoming = upcoming.filter(e => e.category === currentCategoryFilter);
        }
        
        upcoming = upcoming.sort((a, b) => a.date - b.date).slice(0, 5);
        
        if (upcoming.length === 0) {
            list.innerHTML = '<p>لا توجد أحداث قادمة.</p>';
            return;
        }
        
        upcoming.forEach(event => {
            const item = document.createElement('div');
            item.classList.add('upcoming-event-item');
            const colorInfo = colors.find(c => c.hex === event.color);
            item.style.borderRightColor = colorInfo ? colorInfo.hex : '#3b82f6';
            item.innerHTML = `<div class="title">${event.title}</div><div class="date">${event.date.toLocaleString('ar-EG')}</div>`;
            item.addEventListener('click', () => openEditModal(event));
            list.appendChild(item);
        });
    }

    function renderCategories() {
        const filterContainer = document.getElementById('category-filters');
        const modalSelect = document.getElementById('event-category');
        const managementList = document.getElementById('category-management-list');

        filterContainer.innerHTML = '<div class="category-filter active" data-category="all">الكل</div>';
        modalSelect.innerHTML = '';
        managementList.innerHTML = '';

        categories.forEach(cat => {
            const filter = document.createElement('div');
            filter.classList.add('category-filter');
            filter.dataset.category = cat.id;
            filter.textContent = cat.name;
            filter.addEventListener('click', () => handleFilterByCategory(cat.id));
            filterContainer.appendChild(filter);

            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            modalSelect.appendChild(option);

            const li = document.createElement('li');
            li.innerHTML = `<span>${cat.name}</span> <button class="delete-category-btn" data-id="${cat.id}"><i class="fas fa-times"></i></button>`;
            managementList.appendChild(li);
        });
        
        document.querySelectorAll('.delete-category-btn').forEach(btn => btn.addEventListener('click', () => handleDeleteCategory(btn.dataset.id)));
        document.querySelector(`.category-filter[data-category="${currentCategoryFilter}"]`).classList.add('active');
    }

    function renderBlogPosts() {
        const container = document.getElementById('blog-posts');
        container.innerHTML = '';
        if (posts.length === 0) {
            container.innerHTML = '<p>لا توجد منشورات. ابدأ بإنشاء واحد!</p>';
            return;
        }

        posts.sort((a,b) => b.id - a.id).forEach(post => {
            const postEl = document.createElement('div');
            postEl.classList.add('blog-post');
            const excerpt = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');
            postEl.innerHTML = `
                <div class="post-content">
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-excerpt">${excerpt}</p>
                </div>
                <div class="post-meta">
                    <span>${new Date(post.id).toLocaleDateString('ar-EG')}</span>
                    <div class="post-actions">
                        <button class="edit-post-btn" data-id="${post.id}"><i class="fas fa-edit"></i> تعديل</button>
                        <button class="delete-post-btn" data-id="${post.id}"><i class="fas fa-trash-alt"></i> حذف</button>
                    </div>
                </div>
            `;
            container.appendChild(postEl);
        });

        container.querySelectorAll('.edit-post-btn').forEach(btn => btn.addEventListener('click', () => openEditPostModal(btn.dataset.id)));
        container.querySelectorAll('.delete-post-btn').forEach(btn => btn.addEventListener('click', () => handleDeletePost(btn.dataset.id)));
    }
    
    // =================================================================================
    // 5. EVENT HANDLERS & LOGIC
    // =================================================================================

    function handleDayClick(dateString) {
        selectedDay = dateString;
        renderDailyDetails(dateString);
        renderCalendar(); // Re-render to show selection
    }
    
    function handleFilterByCategory(category) {
        currentCategoryFilter = category;
        document.querySelectorAll('.category-filter.active').forEach(f => f.classList.remove('active'));
        document.querySelector(`.category-filter[data-category="${category}"]`).classList.add('active');
        refreshUI();
    }
    
    function switchTab(tabId) {
        document.querySelectorAll('.nav-tab.active').forEach(t => t.classList.remove('active'));
        document.querySelector(`.nav-tab[data-tab="${tabId}"]`).classList.add('active');
        document.querySelectorAll('.main-area.active').forEach(a => a.classList.remove('active'));
        document.getElementById(`${tabId}-area`).classList.add('active');
    }

    function handleEventFormSubmit(e) {
        e.preventDefault();
        const eventId = document.getElementById('event-id').value;
        const eventData = {
            id: eventId ? parseInt(eventId) : Date.now(),
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            date: new Date(document.getElementById('event-date').value),
            category: document.getElementById('event-category').value,
            color: document.getElementById('event-color').value,
            reminder: document.getElementById('event-reminder').value,
        };

        if (eventId) {
            events = events.map(event => event.id === parseInt(eventId) ? eventData : event);
        } else {
            events.push(eventData);
        }
        
        Store.saveData();
        setNotification(eventData);
        closeModal(eventModal);
        refreshUI();
        if(selectedDay) renderDailyDetails(selectedDay);
    }
    
    function handleDeleteEvent(eventId) {
        if (confirm('هل أنت متأكد من حذف هذا الحدث؟')) {
            events = events.filter(e => e.id !== parseInt(eventId));
            Store.saveData();
            refreshUI();
            if(selectedDay) renderDailyDetails(selectedDay);
        }
    }
    
    function handlePostFormSubmit(e) {
        e.preventDefault();
        const postId = document.getElementById('post-id').value;
        const postData = {
            id: postId ? parseInt(postId) : Date.now(),
            title: document.getElementById('post-title').value,
            content: document.getElementById('post-content').value,
        };

        if (postId) {
            posts = posts.map(p => p.id === parseInt(postId) ? postData : p);
        } else {
            posts.push(postData);
        }
        Store.saveData();
        closeModal(postModal);
        renderBlogPosts();
    }
    
    function handleDeletePost(postId) {
        if (confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
            posts = posts.filter(p => p.id !== parseInt(postId));
            Store.saveData();
            renderBlogPosts();
        }
    }

    function handleAddCategory(e) {
        e.preventDefault();
        const input = document.getElementById('new-category-name');
        const name = input.value.trim();
        if (name) {
            categories.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name });
            Store.saveData();
            renderCategories();
            input.value = '';
        }
    }

    function handleDeleteCategory(categoryId) {
        if (categories.length <= 1) {
            alert('يجب أن يكون هناك تصنيف واحد على الأقل.');
            return;
        }
        if (confirm('هل أنت متأكد؟ حذف التصنيف سيؤثر على الأحداث المرتبطة به.')) {
            categories = categories.filter(c => c.id !== categoryId);
            // Optional: Re-assign events with the deleted category to a default one
            events.forEach(e => {
                if (e.category === categoryId) e.category = categories[0].id;
            });
            Store.saveData();
            renderCategories();
        }
    }
    
    // =================================================================================
    // 6. MODAL MANAGEMENT
    // =================================================================================
    function openModal(modal, onOpen) {
        modal.style.display = 'flex';
        if (onOpen) onOpen();
    }
    
    function closeModal(modal) {
        modal.style.display = 'none';
    }

    function openEventModal(dateString) {
        openModal(eventModal, () => {
            document.getElementById('modal-title').innerText = 'إضافة حدث جديد';
            document.getElementById('event-form').reset();
            document.getElementById('event-id').value = '';
            document.getElementById('delete-event-btn').style.display = 'none';
            document.getElementById('event-date').value = `${dateString}T09:00`;
            selectColor(colors[0].hex); // Select default color
        });
    }

    function openEditModal(event) {
        openModal(eventModal, () => {
            document.getElementById('modal-title').innerText = 'تعديل الحدث';
            document.getElementById('event-form').reset();
            document.getElementById('delete-event-btn').style.display = 'inline-block';
            
            document.getElementById('event-id').value = event.id;
            document.getElementById('event-title').value = event.title;
            document.getElementById('event-description').value = event.description || '';
            document.getElementById('event-date').value = new Date(event.date.getTime() - (event.date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            document.getElementById('event-category').value = event.category;
            document.getElementById('event-reminder').value = event.reminder || 'none';
            selectColor(event.color);
        });
    }
    function openEditModalById(eventId) {
        const event = events.find(e => e.id === parseInt(eventId));
        if(event) openEditModal(event);
    }

    function openPostModal() {
        openModal(postModal, () => {
            document.getElementById('post-modal-title').innerText = 'إنشاء منشور جديد';
            document.getElementById('post-form').reset();
            document.getElementById('post-id').value = '';
        });
    }

    function openEditPostModal(postId) {
        const post = posts.find(p => p.id === parseInt(postId));
        if (post) {
            openModal(postModal, () => {
                document.getElementById('post-modal-title').innerText = 'تعديل المنشور';
                document.getElementById('post-form').reset();
                document.getElementById('post-id').value = post.id;
                document.getElementById('post-title').value = post.title;
                document.getElementById('post-content').value = post.content;
            });
        }
    }
    
    function openDatePicker() {
        let currentYear = new Date().getFullYear() + Math.floor(nav / 12);
        const grid = document.getElementById('months-grid');
        const yearDisplay = document.getElementById('year-display');

        function renderMonths() {
            yearDisplay.textContent = currentYear;
            grid.innerHTML = '';
            for(let i=0; i < 12; i++) {
                const cell = document.createElement('div');
                cell.classList.add('month-cell');
                cell.textContent = months[i];
                cell.addEventListener('click', () => {
                    const today = new Date();
                    nav = (currentYear - today.getFullYear()) * 12 + (i - today.getMonth());
                    refreshUI();
                    closeModal(datePickerModal);
                });
                grid.appendChild(cell);
            }
        }
        
        document.getElementById('prev-year-btn').onclick = () => { currentYear--; renderMonths(); };
        document.getElementById('next-year-btn').onclick = () => { currentYear++; renderMonths(); };

        openModal(datePickerModal, renderMonths);
    }
    
    // =================================================================================
    // 7. ADVANCED FEATURES & HELPERS
    // =================================================================================
    
    function selectColor(colorHex) {
        document.querySelectorAll('.color-dot.selected').forEach(d => d.classList.remove('selected'));
        const newSelected = document.querySelector(`.color-dot[data-color="${colorHex}"]`);
        if (newSelected) newSelected.classList.add('selected');
        document.getElementById('event-color').value = colorHex;
    }

    function setNotification(event) {
        if (event.reminder === 'none' || !('Notification' in window)) return;
        const now = new Date();
        const reminderTime = new Date(event.date.getTime() - event.reminder * 60000);
        if (reminderTime > now) {
            const timeout = reminderTime.getTime() - now.getTime();
            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification('تذكير: ' + event.title, { body: `لديك موعد "${event.title}" الآن.` });
                }
            }, timeout);
        }
    }
    
    function handleExportData() {
        const dataStr = JSON.stringify({ events, posts, categories });
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nadh_m_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function handleImportData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.events && importedData.posts && importedData.categories) {
                    if(confirm('سيتم استبدال جميع البيانات الحالية. هل تريد المتابعة؟')) {
                        events = importedData.events;
                        posts = importedData.posts;
                        categories = importedData.categories;
                        events.forEach(ev => ev.date = new Date(ev.date)); // Important
                        Store.saveData();
                        refreshUI();
                        alert('تم استيراد البيانات بنجاح!');
                    }
                } else {
                    alert('ملف غير صالح.');
                }
            } catch (error) {
                alert('حدث خطأ أثناء قراءة الملف.');
            }
        };
        reader.readAsText(file);
    }

    function refreshUI() {
        renderCalendar();
        renderUpcomingEvents();
        renderCategories();
        renderBlogPosts();
    }
    
    // =================================================================================
    // 8. INITIALIZATION
    // =================================================================================
    function init() {
        // Load data from store
        const data = Store.getData();
        events = data.events;
        posts = data.posts;
        categories = data.categories;

        // Theme setup
        const themeSwitcher = document.getElementById('theme-switcher');
        const currentTheme = Store.getTheme();
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeSwitcher.checked = true;
        }
        themeSwitcher.addEventListener('change', () => {
            if (themeSwitcher.checked) {
                document.body.classList.add('dark-mode');
                Store.setTheme('dark');
            } else {
                document.body.classList.remove('dark-mode');
                Store.setTheme('light');
            }
        });

        // Populate color picker
        const colorContainer = document.getElementById('color-options');
        colors.forEach(color => {
            const dot = document.createElement('span');
            dot.classList.add('color-dot');
            dot.dataset.color = color.hex;
            dot.style.backgroundColor = color.hex;
            dot.addEventListener('click', () => selectColor(color.hex));
            colorContainer.appendChild(dot);
        });

        // Attach all event listeners
        document.getElementById('next-month-btn').addEventListener('click', () => { nav++; refreshUI(); });
        document.getElementById('prev-month-btn').addEventListener('click', () => { nav--; refreshUI(); });
        currentMonthYear.addEventListener('click', openDatePicker);

        document.getElementById('addEventBtn').addEventListener('click', () => openEventModal(selectedDay || new Date().toISOString().split('T')[0]));
        document.getElementById('create-post-btn').addEventListener('click', openPostModal);
        
        document.querySelectorAll('.nav-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
        document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal'))));

        document.getElementById('event-form').addEventListener('submit', handleEventFormSubmit);
        document.getElementById('post-form').addEventListener('submit', handlePostFormSubmit);
        document.getElementById('delete-event-btn').addEventListener('click', () => handleDeleteEvent(document.getElementById('event-id').value));
        document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);

        searchInput.addEventListener('input', renderCalendar);
        
        document.getElementById('export-data-btn').addEventListener('click', handleExportData);
        document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
        document.getElementById('import-file-input').addEventListener('change', handleImportData);

        // Voice recognition setup
        const voiceBtn = document.getElementById('voice-command-btn');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'ar-SA';
            voiceBtn.addEventListener('click', () => { voiceBtn.classList.add('pulse'); recognition.start(); });
            recognition.onresult = (event) => { alert(`أمر صوتي مستلم: "${event.results[0][0].transcript}"`); };
            recognition.onend = () => { voiceBtn.classList.remove('pulse'); };
        } else {
            voiceBtn.style.display = 'none';
        }

        // Initial render
        refreshUI();
        switchTab('calendar');
        
        // Request notification permission on first load
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    init();
});
