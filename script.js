        let projects = [];
        let selectedProject = null;
        let isDarkMode = true;
        let searchTerm = '';
        let hideCompleted = false;
        let currentPomodoroTask = null;
        let pomodoroTimer = null;
        let pomodoroDuration = 25;
        let pomodoroTimeLeft = pomodoroDuration * 60;
        let pomodoroStartTime = null;
        let isPomodoroCountUp = false;
        let isPomodoroRunning = false;
        let pomodoroElapsedTime = 0;
        let pomodoroPausedTime = null;
        let timerSound = document.getElementById('timer-sound');
        let projectDropdowns = [];
        let lastCompletedTask = null; // Added to handle start-new-session

        function createElement(tag, options = {}) {
            const element = document.createElement(tag);
            for (let [key, value] of Object.entries(options)) {
                element.setAttribute(key, value);
            }
            return element;
        }

        function createButton(options = {}) {
            return createElement('button', options);
        }

        function createSVGIcon(pathData, className = '') {
            const svg = createElement('svg', {
                class: className,
                viewBox: '0 0 24 24'
            });
            const path = createElement('path', {
                d: pathData,
                'stroke-width': '2'
            });
            svg.appendChild(path);
            return svg;
        }

        function loadInitialData() {
            const savedData = localStorage.getItem('taskManagerData');
            if (savedData) {
                projects = JSON.parse(savedData);
            } else {
                projects = [
                    {
                        id: generateId(),
                        name: "Learning AI",
                        tasks: [
                            {
                                id: generateId(),
                                title: "Hugging Face Course",
                                timeSpent: 0,
                                isTimerRunning: false,
                                isExpanded: true,
                                isCompleted: false,
                                inToday: true,
                                dailyGoal: 2,
                                subtasks: [
                                    {
                                        id: generateId(),
                                        title: "NLP with Transformers",
                                        timeSpent: 2300,
                                        isTimerRunning: false,
                                        isExpanded: false,
                                        isCompleted: true,
                                        subtasks: []
                                    },
                                    {
                                        id: generateId(),
                                        title: "Audio Processing Course https://huggingface.co/learn/audio-course",
                                        timeSpent: 1500,
                                        isTimerRunning: false,
                                        isExpanded: false,
                                        isCompleted: false,
                                        inToday: true,
                                        dailyGoal: 3,
                                        subtasks: []
                                    }
                                ]
                            },
                            {
                                id: generateId(),
                                title: "Practice Projects",
                                timeSpent: 0,
                                isTimerRunning: false,
                                isExpanded: true,
                                isCompleted: false,
                                subtasks: [
                                    {
                                        id: generateId(),
                                        title: "Build a Chatbot using Transformers",
                                        timeSpent: 0,
                                        isTimerRunning: false,
                                        isExpanded: false,
                                        isCompleted: false,
                                        subtasks: []
                                    },
                                    {
                                        id: generateId(),
                                        title: "Image Generation with Stable Diffusion",
                                        timeSpent: 0,
                                        isTimerRunning: false,
                                        isExpanded: false,
                                        isCompleted: true,
                                        subtasks: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: generateId(),
                        name: "Reading Book",
                        tasks: [
                            {
                                id: generateId(),
                                title: "Read Chapter 1",
                                timeSpent: 0,
                                isTimerRunning: false,
                                isExpanded: false,
                                isCompleted: false,
                                inToday: false,
                                dailyGoal: 0,
                                subtasks: []
                            },
                            {
                                id: generateId(),
                                title: "Take Notes",
                                timeSpent: 0,
                                isTimerRunning: false,
                                isExpanded: false,
                                isCompleted: false,
                                inToday: false,
                                dailyGoal: 0,
                                subtasks: []
                            }
                        ]
                    }
                ];
            }
            projects.forEach(project => {
                project.tasks.forEach(task => {
                    initializeTaskProperties(task);
                });
            });

            // Add single global event listener for dropdowns
            if (!window.dropdownClickListenerAdded) {
                document.addEventListener('click', () => {
                    // Always use global projectDropdowns array
                    projectDropdowns.forEach(dropdown => {
                        dropdown.classList.add('hidden');
                    });
                });
                window.dropdownClickListenerAdded = true;
            }
        }

        function initializeTaskProperties(task) {
            if (task.inToday === undefined) task.inToday = false;
            if (task.inWeek === undefined) task.inWeek = false;
            if (task.dailyGoal === undefined) task.dailyGoal = 0;
            if (task.dailyProgress === undefined) task.dailyProgress = 0;
            if (task.isExpanded === undefined) task.isExpanded = false;
            if (task.isTimerRunning === undefined) task.isTimerRunning = false;
            if (task.isCompleted === undefined) task.isCompleted = false;
            if (task.timeSpent === undefined) task.timeSpent = 0;
            if (task.subtasks === undefined) task.subtasks = [];
            if (task.timeEntries === undefined) task.timeEntries = [];
            // Add start and end dates for Gantt chart
            if (task.start === undefined) task.start = new Date().toISOString().split('T')[0];
            if (task.end === undefined) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // Default duration: 1 week
                task.end = endDate.toISOString().split('T')[0];
            }
            if (task.progress === undefined) task.progress = task.isCompleted ? 100 : 0;
            task.subtasks.forEach(subtask => initializeTaskProperties(subtask));
        }

        function saveData() {
            localStorage.setItem('taskManagerData', JSON.stringify(projects));
        }

        function generateId() {
            return Math.random().toString(36).substr(2, 9);
        }

        function getTimeWindowData(daysWindow) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - daysWindow + 1);
            let totalTime = 0;

            projects.forEach(project => {
                const processTask = (task) => {
                    if (task.timeEntries) {
                        task.timeEntries.forEach(entry => {
                            const entryDate = new Date(entry.start);
                            if (entryDate >= startDate && entryDate <= today) {
                                totalTime += entry.duration;
                            }
                        });
                    }
                    task.subtasks.forEach(processTask);
                };
                project.tasks.forEach(processTask);
            });
            return totalTime;
        }

        function getWeeklyEarningsData() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weeks = [];

            // Get data for last 4 weeks plus next week, aligned to Monday-Sunday
            for (let i = 3; i >= -1; i--) {  // Changed to start at 3 and go to -1 for next week
                const weekEnd = new Date(today);
                // Move to the most recent Sunday
                while (weekEnd.getDay() !== 0) {
                    weekEnd.setDate(weekEnd.getDate() - 1);
                }
                weekEnd.setDate(weekEnd.getDate() - (i * 7));

                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekEnd.getDate() - 6); // Go back to Monday

                weeks.push({
                    weekStart: weekStart,
                    weekEnd: weekEnd,
                    earnings: 0
                });
            }

            projects.forEach(project => {
                traverseTasks(project.tasks, task => {
                    if (task.isBillable && task.hourlyRate > 0 && task.timeEntries) {
                        task.timeEntries.forEach(entry => {
                            const entryDate = new Date(entry.start);
                            const week = weeks.find(w =>
                                entryDate >= w.weekStart &&
                                entryDate <= w.weekEnd
                            );
                            if (week) {
                                week.earnings += (entry.duration / 3600) * task.hourlyRate;
                            }
                        });
                    }
                });
            });

            return weeks;
        }

        function getWeeklyTimeData() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                days.push({
                    date: date,
                    timeSpent: 0
                });
            }
            projects.forEach(project => {
                const processTask = (task) => {
                    if (task.timeEntries) {
                        task.timeEntries.forEach(entry => {
                            const entryDate = new Date(entry.start);
                            entryDate.setHours(0, 0, 0, 0);
                            const dayData = days.find(d =>
                                d.date.getTime() === entryDate.getTime()
                            );
                            if (dayData) {
                                dayData.timeSpent += entry.duration;
                            }
                        });
                    }
                    task.subtasks.forEach(processTask);
                };
                project.tasks.forEach(processTask);
            });
            return days;
        }

        function renderWeeklyEarningsChart() {
            const ctx = document.getElementById('weeklyEarningsChart');
            if (!ctx) return;

            const weekData = getWeeklyEarningsData();
            const labels = weekData.map(w => {
                const start = w.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const end = w.weekEnd.toLocaleDateString('en-US', { day: 'numeric' });
                return `${start}-${end}`;
            });
            const data = weekData.map(w => w.earnings.toFixed(2));

            if (window.weeklyEarningsChart instanceof Chart) {
                window.weeklyEarningsChart.destroy();
            }

            window.weeklyEarningsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Weekly Earnings ($)',
                        data: data,
                        backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.8)',
                        borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointBackgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 1)',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return '$' + value;
                                },
                                color: isDarkMode ? '#e5e7eb' : '#374151'
                            },
                            grid: {
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: isDarkMode ? '#e5e7eb' : '#374151'
                            },
                            grid: {
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: isDarkMode ? '#e5e7eb' : '#374151'
                            }
                        }
                    }
                }
            });
        }



        function getWeekTasks() {
            let weekTasks = [];
            projects.forEach(project => {
                project.tasks.forEach(task => {
                    if (task.inWeek) {
                        task.projectId = project.id; // Assign projectId to the task
                        weekTasks.push(task);
                    }
                    traverseTasks(task.subtasks, (subtask) => {
                        if (subtask.inWeek) {
                            subtask.projectId = project.id;
                            weekTasks.push(subtask);
                        }
                    });
                });
            });
            return weekTasks;
        }

        function resetWeekTasks() {
            if (confirm('Are you sure you want to reset all week\'s tasks? This will remove tasks from week\'s list.')) {
                projects.forEach(project => {
                    traverseTasks(project.tasks, task => {
                        if (task.inWeek) {
                            task.inWeek = false;
                        }
                    });
                });
                saveData();
                renderDashboard();
                renderTaskList();
                renderProjectList();
            }
        }

        function resetTodayTasks() {
            if (confirm('Are you sure you want to reset all today\'s tasks? This will clear all goals and remove tasks from today\'s list.')) {
                projects.forEach(project => {
                    traverseTasks(project.tasks, task => {
                        if (task.inToday) {
                            task.inToday = false;
                            task.dailyGoal = 0;
                            task.dailyProgress = 0;
                        }
                    });
                });
                saveData();
                renderDashboard();
                renderTaskList();
                renderProjectList();
            }
        }

        let currentTimeEntryTask = null;

        function getWeekNumber(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        }

        let currentEditingTask = null;

        function openTaskSettings(task) {
            currentEditingTask = task;
            document.getElementById('task-name-input').value = task.title;
            document.getElementById('task-billable').checked = task.isBillable || false;
            document.getElementById('task-rate').value = task.hourlyRate || 0;
            document.getElementById('task-pomodoro-duration').value = task.pomodoroDuration || '';
            document.getElementById('rate-input-container').classList.toggle('hidden', !task.isBillable);
            
            // Add date inputs to the modal
            const modalContent = document.querySelector('#task-settings-modal .space-y-4');
            if (!document.getElementById('task-dates-container')) {
                const datesContainer = document.createElement('div');
                datesContainer.id = 'task-dates-container';
                datesContainer.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block mb-2">Start Date</label>
                            <input type="date" id="task-start-date" 
                                class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        </div>
                        <div>
                            <label class="block mb-2">End Date</label>
                            <input type="date" id="task-end-date"
                                class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        </div>
                    </div>
                `;
                modalContent.insertBefore(datesContainer, document.getElementById('rate-input-container'));
            }
            
            document.getElementById('task-start-date').value = task.start;
            document.getElementById('task-end-date').value = task.end;
            
            document.getElementById('task-settings-modal').classList.remove('hidden');
        }

        function closeTaskSettings() {
            document.getElementById('task-settings-modal').classList.add('hidden');
            currentEditingTask = null;
        }

        function saveTaskSettings() {
            if (currentEditingTask) {
                const newTitle = document.getElementById('task-name-input').value.trim();
                const isBillable = document.getElementById('task-billable').checked;
                const hourlyRate = parseFloat(document.getElementById('task-rate').value) || 0;
                const pomodoroDuration = parseInt(document.getElementById('task-pomodoro-duration').value) || 0;
                const startDate = document.getElementById('task-start-date').value;
                const endDate = document.getElementById('task-end-date').value;

                if (newTitle) {
                    const task = findTaskByIdGlobal(currentEditingTask.id);
                    if (task) {
                        task.title = newTitle;
                        task.isBillable = isBillable;
                        task.hourlyRate = hourlyRate;
                        task.pomodoroDuration = pomodoroDuration || null;
                        task.start = startDate;
                        task.end = endDate;
                        saveData();
                        renderTaskList();
                        initGanttChart(); // Refresh Gantt chart after saving
                    }
                }
            }
            closeTaskSettings();
        }

        // Add event listeners for task settings modal
        document.getElementById('cancel-task-settings').addEventListener('click', closeTaskSettings);
        document.getElementById('save-task-settings').addEventListener('click', saveTaskSettings);
        document.getElementById('task-billable').addEventListener('change', function (e) {
            document.getElementById('rate-input-container').classList.toggle('hidden', !e.target.checked);
        });

        // Close modal when clicking outside
        document.getElementById('task-settings-modal').addEventListener('click', function (e) {
            if (e.target === this) {
                closeTaskSettings();
            }
        });

        function showTimeLog(task) {
            const modal = document.getElementById('time-log-modal');
            const entriesContainer = document.getElementById('time-log-entries');
            entriesContainer.innerHTML = '';

            if (task.timeEntries && task.timeEntries.length > 0) {
                // Sort entries by date, newest first
                const sortedEntries = [...task.timeEntries].sort((a, b) =>
                    new Date(b.start) - new Date(a.start)
                );

                sortedEntries.forEach((entry, index) => {
                    const entryDiv = document.createElement('div');
                    entryDiv.className = 'mb-4 p-4 border rounded dark:border-gray-700';

                    const startDate = new Date(entry.start);
                    const duration = entry.duration;
                    const hours = Math.floor(duration / 3600);
                    const minutes = Math.floor((duration % 3600) / 60);

                    entryDiv.innerHTML = `
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="font-medium">${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Duration: ${hours}h ${minutes}m ${duration % 60}s</div>
                            </div>
                            <div class="flex space-x-2">
                                <button class="text-blue-500 hover:text-blue-700" onclick="editTimeEntry('${task.id}', '${entry.start}', ${duration})">
                                    Edit
                                </button>
                                <button class="text-red-500 hover:text-red-700" onclick="deleteTimeEntry('${task.id}', '${entry.start}', ${duration})">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                    entriesContainer.appendChild(entryDiv);
                });
            } else {
                entriesContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No time entries yet</p>';
            }

            modal.classList.remove('hidden');

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        function editTimeEntry(taskId, entryStart, entryDuration) {
            const task = findTaskByIdGlobal(taskId);
            if (!task || !task.timeEntries) return;

            const entry = task.timeEntries.find(e => e.start === entryStart && e.duration === entryDuration);
            if (!entry) return;
            const startDate = new Date(entry.start);

            // Pre-fill the time entry modal with existing values
            document.getElementById('manual-time-minutes').value = Math.floor(entry.duration / 60);
            document.getElementById('manual-time-date').value = startDate.toISOString().split('T')[0];

            // Delete the old entry
            task.timeSpent -= entry.duration;
            task.timeEntries.splice(entryIndex, 1);

            // Open the time entry modal for editing
            openTimeEntryModal(task);

            // Hide the time log modal
            document.getElementById('time-log-modal').classList.add('hidden');
        }

        function deleteTimeEntry(taskId, entryStart, entryDuration) {
            if (!confirm('Are you sure you want to delete this time entry?')) return;

            const task = findTaskByIdGlobal(taskId);
            if (!task || !task.timeEntries) return;

            const entryIndex = task.timeEntries.findIndex(entry =>
                entry.start === entryStart &&
                entry.duration === entryDuration
            );

            if (entryIndex !== -1) {
                task.timeSpent -= task.timeEntries[entryIndex].duration;
                task.timeEntries.splice(entryIndex, 1);

                saveData();
                renderTaskList();
                renderProjectList();
                renderDashboard();
                showTimeLog(task); // Refresh the time log display
            }
        }

        // Add close button event listener
        document.getElementById('close-time-log').addEventListener('click', () => {
        document.getElementById('time-log-modal').classList.add('hidden');
        });

        function init() {
            loadInitialData();
            renderProjectList();
            showDashboard();
            setupEventListeners();
            setupTimeEntryModal();

            // Load settings
            const settings = JSON.parse(localStorage.getItem('settings')) || {
                silenceMode: false,
                pomodoroDuration: 25,
                soundType: 'default',
                soundUrl: 'https://www.soundjay.com/buttons/sounds/beep-07a.mp3'
            };

            document.getElementById('silence-mode').checked = settings.silenceMode;
            document.getElementById('pomodoro-duration').value = settings.pomodoroDuration;
            document.getElementById('sound-select').value = settings.soundType;
            timerSound.src = settings.soundUrl;

            // Load Pomodoro timer state from localStorage
            const savedPomodoro = JSON.parse(localStorage.getItem('pomodoroTimerState'));
            if (savedPomodoro && savedPomodoro.isPomodoroRunning && savedPomodoro.currentPomodoroTaskId) {
                const task = findTaskByIdGlobal(savedPomodoro.currentPomodoroTaskId);
                if (task) {
                    currentPomodoroTask = task;
                    isPomodoroCountUp = savedPomodoro.isPomodoroCountUp;
                    pomodoroDuration = savedPomodoro.pomodoroDuration;
                    pomodoroStartTime = savedPomodoro.pomodoroStartTime;
                    isPomodoroRunning = true;
                    document.getElementById('pomodoro-display').classList.remove('hidden');
                    document.getElementById('current-task-title').textContent = task.title;
                    updatePomodoroTimer();
                    pomodoroTimer = setInterval(updatePomodoroTimer, 100);

                    // Setup button handlers
                    document.getElementById('stop-pomodoro').onclick = stopPomodoro;
                    document.getElementById('pause-pomodoro').onclick = pausePomodoro;
                    document.getElementById('resume-pomodoro').onclick = resumePomodoro;
                    document.getElementById('toggle-count-mode').onclick = toggleCountMode;

                    // Show pause button, hide resume
                    document.getElementById('pause-pomodoro').classList.remove('hidden');
                    document.getElementById('resume-pomodoro').classList.add('hidden');
                } else {
                    // If the task no longer exists, remove the saved state
                    removePomodoroState();
                }
            }

            // Setup settings modal listeners
            document.getElementById('settings-btn').addEventListener('click', showSettings);
            document.getElementById('close-settings').addEventListener('click', hideSettings);
            document.getElementById('sound-select').addEventListener('change', handleSoundSelection);
            document.getElementById('test-sound-btn').addEventListener('click', testSound);
            document.getElementById('close-timer-complete').addEventListener('click', closeTimerComplete);
            // Setup settings change listeners
            document.getElementById('silence-mode').addEventListener('change', saveSettings);
            document.getElementById('pomodoro-duration').addEventListener('change', saveSettings);
            document.getElementById('sound-select').addEventListener('change', (e) => {
                handleSoundSelection(e);
                saveSettings();
            });
            isDarkMode = document.documentElement.classList.contains('dark');
            const icon = document.getElementById('dark-mode-icon');
            if (isDarkMode) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }

        function exportData() {
            const data = JSON.stringify(projects, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `focus-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function importData(file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (Array.isArray(importedData)) {
                        if (confirm('This will replace all existing data. Are you sure?')) {
                            projects = importedData;
                            saveData();
                            renderProjectList();
                            renderTaskList();
                            renderDashboard();
                            alert('Data imported successfully!');
                        }
                    } else {
                        alert('Invalid data format');
                    }
                } catch (error) {
                    alert('Error importing data: ' + error.message);
                }
            };
            reader.readAsText(file);
        }

        function setupEventListeners() {
            document.getElementById('export-btn').addEventListener('click', exportData);
            document.getElementById('import-btn').addEventListener('click', () => {
                document.getElementById('import-file').click();
            });
            document.getElementById('import-file').addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    importData(e.target.files[0]);
                    e.target.value = ''; // Reset file input
                }
            });
            // Removed the 'reset-today-btn' listener from here
            document.getElementById('new-project-name').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const projectNameInput = document.getElementById('new-project-name');
                    const name = projectNameInput.value.trim();
                    if (name) {
                        const newProject = {
                            id: generateId(),
                            name: name,
                            tasks: []
                        };
                        projects.push(newProject);
                        saveData();
                        renderProjectList();
                        projectNameInput.value = '';
                    }
                }
            });
            document.getElementById('new-task-title').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const title = e.target.value.trim();
                    if (title) {
                        addTask(null, title);
                        e.target.value = '';
                    }
                }
            });
            document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
            document.getElementById('report-btn').addEventListener('click', showReport);
            document.getElementById('close-report-btn').addEventListener('click', hideReport);
            document.getElementById('search-input').addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                renderTaskList();
            });
            document.getElementById('hide-completed-btn').addEventListener('click', () => {
                hideCompleted = !hideCompleted;
                document.getElementById('hide-completed-btn').classList.toggle('bg-gray-200');
                renderTaskList();
            });
            document.addEventListener('keydown', handleKeyDown);
        }

        function setupTimeEntryModal() {
            document.getElementById('cancel-time-entry').addEventListener('click', () => {
                closeTimeEntryModal();
            });
            document.getElementById('save-time-entry').addEventListener('click', () => {
                saveTimeEntry();
            });

            // Close modal when clicking outside the content
            document.getElementById('time-entry-modal').addEventListener('click', function () {
                closeTimeEntryModal();
            });

            // Prevent clicks inside the content from closing the modal
            document.getElementById('time-entry-modal-content').addEventListener('click', function (e) {
                e.stopPropagation();
            });
        }

        function openTimeEntryModal(task) {
            currentTimeEntryTask = task;
            document.getElementById('time-entry-modal').classList.remove('hidden');
            document.getElementById('manual-time-minutes').value = '';
            // Set today as default date when opening modal
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('manual-time-date').value = today;
            document.getElementById('manual-time-minutes').focus();
        }

        function closeTimeEntryModal() {
            document.getElementById('time-entry-modal').classList.add('hidden');
            currentTimeEntryTask = null;
        }

        function saveTimeEntry() {
            const minutes = parseInt(document.getElementById('manual-time-minutes').value);
            const dateStr = document.getElementById('manual-time-date').value;

            if (!minutes || minutes <= 0 || !dateStr) {
                alert('Please enter valid duration and date');
                return;
            }

            const date = new Date(dateStr);
            date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

            // Create start date from input date at current time
            const now = new Date();
            date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

            const timeEntry = {
                start: date.toISOString(),
                end: new Date(date.getTime() + minutes * 60000).toISOString(),
                duration: minutes * 60
            };

            const task = findTaskByIdGlobal(currentTimeEntryTask.id);
            if (task) {
                if (!task.timeEntries) {
                    task.timeEntries = [];
                }
                task.timeEntries.push(timeEntry);
                task.timeSpent += timeEntry.duration;

                if (task.inToday) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let todayTimeSpent = 0;
                    task.timeEntries.forEach(entry => {
                        const entryDate = new Date(entry.start);
                        if (entryDate >= today) {
                            todayTimeSpent += entry.duration;
                        }
                    });
                    task.dailyProgress = Math.floor(todayTimeSpent / 60 / pomodoroDuration); // Changed from 25 to pomodoroDuration
                }

                saveData();
                renderTaskList();
                renderProjectList();
                renderDashboard();
                closeTimeEntryModal();
            }
        }

        function handleKeyDown(e) {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        document.getElementById('new-task-title').focus();
                        break;
                    case 'p':
                        e.preventDefault();
                        document.getElementById('new-project-name').focus();
                        break;
                    case '/':
                        e.preventDefault();
                        document.getElementById('search-input').focus();
                        break;
                }
            }
        }


        function renderProjectList() {
            const projectList = document.getElementById('project-list');
            projectList.innerHTML = '';
            projectDropdowns = []; // Reset global array
            projects.forEach(project => {
                const projectDiv = document.createElement('div');
                projectDiv.className = 'mb-4';
                const headerDiv = document.createElement('div');
                headerDiv.className = 'flex items-center justify-between mb-1';
                const btn = document.createElement('button');
                btn.textContent = project.name;
                btn.className = `flex-grow text-left p-2 rounded mr-2 ${selectedProject && selectedProject.id === project.id ? "bg-blue-500 text-white" : "bg-gray-100 text-black dark:bg-gray-700 dark:text-gray-200"}`;
                btn.addEventListener('click', () => selectProject(project.id));
                const statsDiv = document.createElement('div');
                statsDiv.className = 'mt-1 px-2';
                const progressContainer = document.createElement('div');
                progressContainer.className = 'flex items-center gap-2';
                const progress = calculateProjectProgress(project.tasks);
                const totalTime = calculateProjectTotalTime(project.tasks);
                const progressBar = document.createElement('div');
                progressBar.className = 'flex-grow h-2 bg-gray-200 rounded dark:bg-gray-600';
                progressBar.innerHTML = `
                    <div class="h-full bg-green-500 rounded" style="width: ${progress}%"></div>
                `;
                const progressText = document.createElement('span');
                progressText.className = 'text-sm text-gray-600 dark:text-gray-400';
                progressText.textContent = `${progress}%`;
                const timeText = document.createElement('span');
                timeText.className = 'text-sm text-gray-600 ml-4 dark:text-gray-400';
                timeText.textContent = `Total: ${(totalTime / 3600).toFixed(1)}h`;
                progressContainer.appendChild(progressBar);
                progressContainer.appendChild(progressText);
                progressContainer.appendChild(timeText);
                statsDiv.appendChild(progressContainer);
                const menuDiv = document.createElement('div');
                menuDiv.className = 'relative';
                const menuBtn = document.createElement('button');
                menuBtn.className = 'p-1 hover:bg-gray-100 rounded dark:hover:bg-gray-700';
                menuBtn.innerHTML = `<i class="fas fa-ellipsis-v text-gray-700 dark:text-gray-200"></i>`;
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dropdown = menuBtn.nextElementSibling;
                    projectDropdowns.forEach(d => {
                        if (d !== dropdown) d.classList.add('hidden');
                    });
                    dropdown.classList.toggle('hidden');
                });
                const dropdownDiv = document.createElement('div');
                dropdownDiv.className = 'dropdown-content absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg hidden z-10 dark:bg-gray-800 dark:border-gray-700';
                const editBtn = document.createElement('button');
                editBtn.innerHTML = 'Edit';
                editBtn.className = 'w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownDiv.classList.add('hidden');
                    editProject(project.id);
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = 'Delete';
                deleteBtn.className = 'w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 dark:hover:bg-gray-700';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownDiv.classList.add('hidden');
                    deleteProject(project.id);
                });
                dropdownDiv.appendChild(editBtn);
                dropdownDiv.appendChild(deleteBtn);
                menuDiv.appendChild(menuBtn);
                menuDiv.appendChild(dropdownDiv);
                projectDropdowns.push(dropdownDiv);
                headerDiv.appendChild(btn);
                headerDiv.appendChild(menuDiv);
                projectDiv.appendChild(headerDiv);
                projectDiv.appendChild(statsDiv);
                projectList.appendChild(projectDiv);
            });
        }

        function editProject(projectId) {
            const project = projects.find(p => p.id === projectId);
            
            // Create modal content
            const modalContent = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800 dark:text-gray-200 w-[400px]">
                        <h2 class="text-xl font-bold mb-4">Edit Project</h2>
                        <div class="space-y-4">
                            <div>
                                <label class="block mb-2">Project Name</label>
                                <input type="text" id="edit-project-name" value="${project.name}" 
                                    class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            </div>
                            <div class="flex items-center space-x-2">
                                <input type="checkbox" id="project-billable" ${project.isBillable ? 'checked' : ''} 
                                    class="rounded dark:bg-gray-700">
                                <label>Billable</label>
                            </div>
                            <div id="project-rate-container" class="${project.isBillable ? '' : 'hidden'}">
                                <label class="block mb-2">Default Hourly Rate ($)</label>
                                <input type="number" id="project-rate" value="${project.hourlyRate || 0}" min="0" step="0.01"
                                    class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end space-x-3">
                            <button id="cancel-project-edit" 
                                class="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                                Cancel
                            </button>
                            <button id="save-project-edit" 
                                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to document
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalContent;
            document.body.appendChild(modalContainer);

            // Setup event listeners
            document.getElementById('project-billable').addEventListener('change', function(e) {
                document.getElementById('project-rate-container').classList.toggle('hidden', !e.target.checked);
            });

            document.getElementById('cancel-project-edit').addEventListener('click', () => {
                document.body.removeChild(modalContainer);
            });

            document.getElementById('save-project-edit').addEventListener('click', () => {
                const newName = document.getElementById('edit-project-name').value.trim();
                const isBillable = document.getElementById('project-billable').checked;
                const hourlyRate = parseFloat(document.getElementById('project-rate').value) || 0;

                if (newName) {
                    project.name = newName;
                    project.isBillable = isBillable;
                    project.hourlyRate = hourlyRate;
                    saveData();
                    renderProjectList();
                    if (selectedProject && selectedProject.id === projectId) {
                        document.getElementById('project-title').textContent = newName;
                    }
                }
                document.body.removeChild(modalContainer);
            });
        }

        function deleteProject(projectId) {
            if (confirm('Are you sure you want to delete this project and all its tasks?')) {
                const index = projects.findIndex(p => p.id === projectId);
                if (index !== -1) {
                    projects.splice(index, 1);
                    saveData();
                    renderProjectList();
                    if (selectedProject && selectedProject.id === projectId) {
                        if (projects.length > 0) {
                            selectedProject = projects[0];
                            document.getElementById('project-title').textContent = selectedProject.name;
                            renderTaskList();
                        } else {
                            selectedProject = null;
                            document.getElementById('project-title').textContent = 'Focus Flow';
                            document.getElementById('task-list').innerHTML = '';
                            showDashboard(); // Redirect to dashboard if no projects left
                        }
                    }
                }
            }
        }

        function selectProject(projectId) {
            selectedProject = projects.find(p => p.id === projectId);
            document.getElementById('project-title').textContent = selectedProject.name;
            document.getElementById('dashboard-view').classList.add('hidden');
            document.getElementById('project-view').classList.remove('hidden');
            renderProjectList();
            renderTaskList();
            initGanttChart(); // Initialize Gantt chart when project is selected
        }

        function showDashboard() {
            selectedProject = null;
            document.getElementById('project-title').textContent = 'BeFocused';
            document.getElementById('project-view').classList.add('hidden');
            document.getElementById('dashboard-view').classList.remove('hidden');
            renderDashboard();
            renderProjectList();
            renderWeeklyChart();
            renderWeeklyEarningsChart();
            renderWeeklyEarningsChart();
        }

        function getWeekStart() {
            const today = new Date();
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
            const monday = new Date(today.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday;
        }

        function calculateTodayEarnings() {
            let totalEarnings = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            projects.forEach(project => {
                traverseTasks(project.tasks, task => {
                    if (task.isBillable && task.hourlyRate > 0 && task.timeEntries) {
                        task.timeEntries.forEach(entry => {
                            const entryDate = new Date(entry.start);
                            if (entryDate >= today) {
                                // Convert seconds to hours and multiply by rate
                                totalEarnings += (entry.duration / 3600) * task.hourlyRate;
                            }
                        });
                    }
                });
            });

            return totalEarnings;
        }

        function countCompletedTodayTasks() {
            let completedTasks = 0;
            const todayTasks = getTodayTasks();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            todayTasks.forEach(task => {
                let todayTimeSpent = 0;
                if (task.timeEntries) {
                    task.timeEntries.forEach(entry => {
                        const entryDate = new Date(entry.start);
                        if (entryDate >= today) {
                            todayTimeSpent += entry.duration;
                        }
                    });
                }
                const dailyProgress = Math.floor(todayTimeSpent / 60 / pomodoroDuration);

                if (task.isCompleted || (task.dailyGoal > 0 && dailyProgress >= task.dailyGoal)) {
                    completedTasks++;
                }
            });
            return completedTasks;
        }

        function renderDashboard() {
            const dashboardView = document.getElementById('dashboard-view');
            let totalProjects = projects.length;
            let totalTasks = 0;
            let totalCompletedTasks = 0;
            let totalTimeSpent = 0;
            let todayTimeSpent = 0;
            let mostActiveProject = { name: '-', time: 0 };
            let highestProgress = { name: '-', progress: 0 };
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            projects.forEach(project => {
                const projectTotalTime = calculateProjectTotalTime(project.tasks);
                const projectProgress = calculateProjectProgress(project.tasks);
                const completedTasks = countTasks(project.tasks, true);
                const ongoingTasks = countTasks(project.tasks, false);
                totalTasks += completedTasks + ongoingTasks;
                totalCompletedTasks += completedTasks;
                totalTimeSpent += projectTotalTime;
                project.tasks.forEach(task => {
                    const calculateTodayTime = (task) => {
                        let time = 0;
                        if (task.timeEntries) {
                            task.timeEntries.forEach(entry => {
                                const entryDate = new Date(entry.start);
                                if (entryDate >= today) {
                                    time += entry.duration;
                                }
                            });
                        }
                        task.subtasks.forEach(subtask => {
                            time += calculateTodayTime(subtask);
                        });
                        return time;
                    };
                    todayTimeSpent += calculateTodayTime(task);
                });
                if (projectTotalTime > mostActiveProject.time) {
                    mostActiveProject = { name: project.name, time: projectTotalTime };
                }
                if (projectProgress > highestProgress.progress) {
                    highestProgress = { name: project.name, progress: projectProgress };
                }
            });
            const weekData = getWeeklyTimeData();
            dashboardView.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="p-6 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-200">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Today's Tasks</h3>
                            <button id="reset-today-btn" class="p-2 border rounded dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700" title="Reset Today's Tasks">
                                <svg class="h-5 w-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <div id="today-tasks-container" class="space-y-3" style="max-height: 600px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">
                            <style>
                                #today-tasks-container::-webkit-scrollbar {
                                    display: none;
                                }
                            </style>
                        </div>
                        <hr class="my-6 border-gray-300 dark:border-gray-600">
                        <div class="mt-6">
                            <h3 class="font-bold mb-2 text-lg">Today's Activity</h3>
                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div class="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg">
                                    <div class="text-white text-sm mb-1">Today's Total Time</div>
                                    <div class="text-white text-2xl font-bold">${formatTime(todayTimeSpent)}</div>
                                </div>
                                <div class="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg">
                                    <div class="text-white text-sm mb-1">Tasks Completed Today</div>
                                    <div class="text-white text-2xl font-bold">${countCompletedTodayTasks()} / ${getTodayTasks().length}</div>
                                </div>
                            </div>
                           
                            <div style="height: 400px;" class="mt-4">
                                <canvas id="weeklyChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-200">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Week's Tasks</h3>
                            <button id="reset-week-btn" class="p-2 border rounded dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700" title="Reset Week's Tasks">
                                <svg class="h-5 w-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <div id="week-tasks-container" class="space-y-3" style="max-height: 600px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">
                            <style>
                                #week-tasks-container::-webkit-scrollbar {
                                    display: none;
                                }
                            </style>
                        </div>
                        <hr class="my-6 border-gray-300 dark:border-gray-600">
                        <div class="mt-6">
                            <h3 class="font-bold mb-2 text-lg">Weekly Activity</h3>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                                    <div class="text-white text-sm mb-1">Past 7 Days</div>
                                    <div id="week-total" class="text-white text-2xl font-bold"></div>
                                </div>
                                <div class="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg">
                                    <div class="text-white text-sm mb-1">Past 30 Days</div>
                                    <div id="month-total" class="text-white text-2xl font-bold"></div>
                                </div>
                            </div>
                            <div style="height: 400px;">
                                <canvas id="weeklyEarningsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Attach event listener for reset-today-btn here
            document.getElementById('reset-today-btn').addEventListener('click', resetTodayTasks);
            document.getElementById('reset-week-btn').addEventListener('click', resetWeekTasks);

            const todayTasksContainer = document.getElementById('today-tasks-container');
            const weekTasksContainer = document.getElementById('week-tasks-container');

            // Handle week's tasks
            const weekTasks = getWeekTasks();
            const sortedWeekTasks = [...weekTasks].sort((a, b) => {
                if (a.isCompleted === b.isCompleted) return 0;
                return a.isCompleted ? 1 : -1;
            });

            weekTasksContainer.innerHTML = '';
            sortedWeekTasks.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-gray-800 overflow-hidden';
                const taskHeader = document.createElement('div');
                taskHeader.className = 'flex items-center justify-between p-3 border-b dark:border-gray-700';
                const leftDiv = document.createElement('div');
                leftDiv.className = 'flex items-center space-x-3 flex-grow max-w-[70%]';
                const statusDiv = document.createElement('div');
                statusDiv.className = `w-2 h-2 rounded-full ${task.isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`;
                leftDiv.appendChild(statusDiv);
                const taskPath = getTaskPath(task.id);
                const labelContainer = document.createElement('div');
                labelContainer.className = 'overflow-hidden';
                const label = createLabelWithLinks(taskPath.join(' > '), `font-medium dark:text-gray-200 break-words ${task.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`);
                const taskLink = document.createElement('a');
                taskLink.href = '#';
                taskLink.appendChild(label);
                taskLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectProject(task.projectId);
                    scrollToTask(task.id);
                });
                labelContainer.appendChild(taskLink);
                leftDiv.appendChild(labelContainer);
                taskHeader.appendChild(leftDiv);
                const rightDiv = document.createElement('div');
                rightDiv.className = 'flex items-center space-x-2';
                const completeBtn = document.createElement('button');
                completeBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
                completeBtn.innerHTML = task.isCompleted ? '✅' : '⬜';
                completeBtn.title = task.isCompleted ? 'Mark as incomplete' : 'Mark as complete';
                completeBtn.addEventListener('click', () => {
                    const originalTask = findTaskByIdGlobal(task.id);
                    if (originalTask) {
                        originalTask.isCompleted = !originalTask.isCompleted;
                        saveData();
                        renderDashboard();
                        renderTaskList();
                    }
                });
                rightDiv.appendChild(completeBtn);
                const todayBtn = createTodayButton(task, () => {
                    const originalTask = findTaskByIdGlobal(task.id);
                    if (originalTask) {
                        originalTask.inToday = !originalTask.inToday;
                        if (originalTask.inToday && originalTask.dailyGoal === 0) {
                            originalTask.dailyGoal = 1;
                        }
                        saveData();
                        renderDashboard();
                        renderTaskList();
                    }
                });
                rightDiv.appendChild(todayBtn);
                const weekBtn = document.createElement('button');
                weekBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
                weekBtn.innerHTML = '📅';
                weekBtn.title = 'Remove from Week\'s Tasks';
                weekBtn.addEventListener('click', () => {
                    const originalTask = findTaskByIdGlobal(task.id);
                    if (originalTask) {
                        originalTask.inWeek = false;
                        saveData();
                        renderDashboard();
                        renderTaskList();
                    }
                });
                rightDiv.appendChild(weekBtn);
                taskHeader.appendChild(rightDiv);
                taskDiv.appendChild(taskHeader);
                weekTasksContainer.appendChild(taskDiv);
            });
            const todayTasks = getTodayTasks();
            // Sort tasks - completed tasks go to the end
            const sortedTasks = [...todayTasks].sort((a, b) => {
                if (a.isCompleted === b.isCompleted) return 0;
                return a.isCompleted ? 1 : -1;
            });
            todayTasksContainer.innerHTML = '';
            sortedTasks.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-gray-800 overflow-hidden';
                const taskHeader = document.createElement('div');
                taskHeader.className = 'flex items-center justify-between p-3 border-b dark:border-gray-700';
                const leftDiv = document.createElement('div');
                leftDiv.className = 'flex items-center space-x-3 flex-grow max-w-[70%]';
                const statusDiv = document.createElement('div');
                statusDiv.className = `w-2 h-2 rounded-full ${task.isCompleted ? 'bg-green-500' : (task.dailyProgress >= task.dailyGoal && task.dailyGoal > 0 ? 'bg-blue-500' : 'bg-yellow-500')}`;
                leftDiv.appendChild(statusDiv);
                const taskPath = getTaskPath(task.id);
                const labelContainer = document.createElement('div');
                labelContainer.className = 'overflow-hidden';
                const label = createLabelWithLinks(taskPath.join(' > '), `font-medium dark:text-gray-200 break-words ${task.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`);
                const taskLink = document.createElement('a');
                taskLink.href = '#';
                taskLink.appendChild(label);
                taskLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectProject(task.projectId);
                    scrollToTask(task.id);
                });
                labelContainer.appendChild(taskLink);
                leftDiv.appendChild(labelContainer);
                taskHeader.appendChild(leftDiv);
                const rightDiv = document.createElement('div');
                rightDiv.className = 'flex items-center space-x-2';
                const todayBtn = createTodayButton(task, () => {
                    const originalTask = findTaskByIdGlobal(task.id);
                    if (originalTask) {
                        originalTask.inToday = false;
                        saveData();
                        renderDashboard();
                        renderTaskList();
                    }
                });
                todayBtn.title = 'Remove from Today\'s Tasks';
                rightDiv.appendChild(todayBtn);
                const timerBtn = createTimerButton(task, () => {
                    const currentTask = findTaskByIdGlobal(task.id);
                    if (currentTask.isTimerRunning) {
                        stopPomodoro();
                    } else {
                        startPomodoro(currentTask);
                    }
                });
                rightDiv.appendChild(timerBtn);
                taskHeader.appendChild(rightDiv);
                const goalInput = document.createElement('input');
                goalInput.type = 'number';
                goalInput.min = 0;
                goalInput.value = task.dailyGoal || 0;
                goalInput.placeholder = 'Daily Goal';
                goalInput.className = 'w-8 text-center border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ml-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
                goalInput.addEventListener('change', () => {
                    task.dailyGoal = parseInt(goalInput.value) || 0;
                    saveData();
                    renderDashboard();
                });
                taskHeader.appendChild(goalInput);
                const progressSection = document.createElement('div');
                progressSection.className = 'p-3';
                const progressContainer = document.createElement('div');
                progressContainer.className = 'flex items-center gap-4';
                const progressText = document.createElement('div');
                progressText.className = 'text-sm text-gray-600 dark:text-gray-400 min-w-fit';
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let todayTimeSpent = 0;
                if (task.timeEntries) {
                    task.timeEntries.forEach(entry => {
                        const entryDate = new Date(entry.start);
                        if (entryDate >= today) {
                            todayTimeSpent += entry.duration;
                        }
                    });
                }
                const pomodorosCompleted = todayTimeSpent / 60 / pomodoroDuration;
                console.log(pomodoroDuration);
                const formattedPomodoros = todayTimeSpent > 0 ? pomodorosCompleted.toFixed(1) : Math.floor(pomodorosCompleted);
                progressText.textContent = `${formattedPomodoros} / ${task.dailyGoal} pomodoros`;
                const progressBarContainer = document.createElement('div');
                progressBarContainer.className = 'flex-grow h-2 bg-gray-200 rounded dark:bg-gray-700';
                const progressPercentage = task.dailyGoal > 0 ? (pomodorosCompleted / task.dailyGoal) * 100 : 0;
                const progressBar = document.createElement('div');
                progressBar.className = `h-full rounded transition-all duration-300 ${progressPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`;
                progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
                progressBarContainer.appendChild(progressBar);
                progressContainer.appendChild(progressText);
                progressContainer.appendChild(progressBarContainer);
                progressSection.appendChild(progressContainer);
                taskDiv.appendChild(taskHeader);
                taskDiv.appendChild(progressSection);
                todayTasksContainer.appendChild(taskDiv);
            });
        }

        function getTodayTasks() {
            let todayTasks = [];
            projects.forEach(project => {
                project.tasks.forEach(task => {
                    if (task.inToday) {
                        task.projectId = project.id; // Assign projectId to the task
                        todayTasks.push(task);
                    }
                    traverseTasks(task.subtasks, (subtask) => {
                        if (subtask.inToday) {
                            subtask.projectId = project.id;
                            todayTasks.push(subtask);
                        }
                    });
                });
            });
            return todayTasks;
        }

        async function addTask(parentId = null, customTitle = null) {
            const title = customTitle || document.getElementById('new-task-title').value.trim();
            if (title && selectedProject) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // Default duration: 1 week

                const newTask = {
                    id: generateId(),
                    title: title,
                    timeSpent: 0,
                    isTimerRunning: false,
                    isExpanded: false,
                    isCompleted: false,
                    subtasks: [],
                    canHaveSubtasks: true,
                    inToday: false,
                    dailyGoal: 0,
                    dailyProgress: 0,
                    isBillable: false,
                    hourlyRate: 0,
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0],
                    progress: 0
                };

                // If this is a subtask, inherit from parent task
                if (parentId) {
                    const parentTask = findTaskById(selectedProject.tasks, parentId);
                    if (parentTask && parentTask.isBillable) {
                        newTask.isBillable = true;
                        newTask.hourlyRate = parentTask.hourlyRate;
                    }
                } 
                // If this is a top-level task, inherit from project
                else if (selectedProject.isBillable) {
                    newTask.isBillable = true;
                    newTask.hourlyRate = selectedProject.hourlyRate;
                }

                if (parentId) {
                    const parentTask = findTaskById(selectedProject.tasks, parentId);
                    if (parentTask) {
                        parentTask.subtasks.push(newTask);
                    }
                } else {
                    selectedProject.tasks.push(newTask);
                }
                saveData();
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        renderTaskList();
                        renderProjectList();
                        initGanttChart(); // Refresh Gantt chart after adding task
                        resolve();
                    });
                });
                if (!customTitle) {
                    document.getElementById('new-task-title').value = '';
                }
            }
        }

        function renderTaskList() {
            const taskList = document.getElementById('task-list');
            taskList.innerHTML = '';
            if (selectedProject) {
                const filteredTasks = filterTasks(selectedProject.tasks, searchTerm);
                filteredTasks.forEach(task => {
                    const taskElement = createTaskElement(task);
                    taskList.appendChild(taskElement);
                });
            }
        }

        function filterTasks(tasks, term) {
            return tasks.filter(task => {
                if (hideCompleted && task.isCompleted) {
                    return false;
                }
                const inTitle = task.title.toLowerCase().includes(term);
                const inSubtasks = filterTasks(task.subtasks, term).length > 0;
                return inTitle || inSubtasks;
            });
        }

        function editTask(taskId, newTitle) {
            const task = findTaskById(selectedProject.tasks, taskId);
            if (task) {
                task.title = newTitle;
                saveData();
                setTimeout(() => {
                    renderTaskList();
                    renderProjectList();
                }, 50);
            }
        }

        function deleteTask(taskId) {
            removeTaskById(selectedProject.tasks, taskId);
            savePomodoroState();
            saveData();
            renderTaskList();
        }

        function createLabelWithLinks(text, className) {
            const label = document.createElement('label');
            const urlPattern = /(https?:\/\/[^\s]+)/g;
            const parts = text.split(urlPattern);
            parts.forEach(part => {
                if (part.match(urlPattern)) {
                    const link = document.createElement('a');
                    link.href = part;
                    link.textContent = part;
                    link.target = '_blank';
                    link.className = 'text-blue-500 hover:text-blue-600 underline';
                    label.appendChild(link);
                } else if (part) {
                    const textNode = document.createTextNode(part);
                    label.appendChild(textNode);
                }
            });
            if (className) {
                label.className = className;
            }
            return label;
        }

        function createTimerButton(task, onClick) {
            const timerBtn = document.createElement('button');
            timerBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            timerBtn.innerHTML = task.isTimerRunning ? `
                <svg class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                </svg>
            ` : `
                <svg class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
            timerBtn.addEventListener('click', onClick);
            return timerBtn;
        }

        function createTodayButton(task, onClick) {
            const todayBtn = document.createElement('button');
            todayBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            todayBtn.innerHTML = task.inToday ? '🌞' : '☀️';
            todayBtn.classList.toggle('bg-yellow-100', task.inToday);
            todayBtn.title = task.inToday ? 'Remove from Today\'s Tasks' : 'Add to Today\'s Tasks';
            todayBtn.addEventListener('click', onClick);
            return todayBtn;
        }

        function createTaskElement(task, level = 0) {
            const container = document.createElement('div');
            container.style.marginLeft = `${level * 24}px`;
            const taskDiv = document.createElement('div');
            taskDiv.id = `task-${task.id}`; // Add ID to the task element
            taskDiv.className = 'flex items-center justify-between p-3 relative bg-white rounded-lg shadow-sm mb-2 hover:shadow-md transition-shadow duration-200 dark:bg-gray-800';
            if (level > 0) {
                const verticalLine = document.createElement('div');
                verticalLine.className = 'absolute left-[-20px] top-0 bottom-0 border-l-2 border-gray-300 dark:border-gray-600';
                taskDiv.appendChild(verticalLine);
                const horizontalLine = document.createElement('div');
                horizontalLine.className = 'absolute left-[-20px] top-1/2 w-[12px] border-t-2 border-gray-300 dark:border-gray-600';
                taskDiv.appendChild(horizontalLine);
            }
            const leftDiv = document.createElement('div');
            leftDiv.className = 'flex items-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.isCompleted;
            checkbox.className = 'mr-2 w-5 h-5 cursor-pointer';
            checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
            leftDiv.appendChild(checkbox);
            const expandBtn = document.createElement('button');
            expandBtn.className = 'mr-1 p-1 text-lg w-6 h-6 hover:bg-gray-100 rounded cursor-pointer flex items-center justify-center dark:hover:bg-gray-700';
            expandBtn.innerHTML = task.isExpanded ? `
                    <svg class="h-4 w-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                ` : `
                    <svg class="h-4 w-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                `;
            expandBtn.addEventListener('click', () => toggleTaskExpand(task.id));
            leftDiv.appendChild(expandBtn);
            const labelClass = task.isCompleted ? 'text-gray-500 dark:text-gray-400' : 'dark:text-gray-200';
            const taskTitle = task.title;
            const label = createLabelWithLinks(taskTitle, `${labelClass} ${task.isCompleted ? 'line-through' : ''}`);
            leftDiv.appendChild(label);
            taskDiv.appendChild(leftDiv);
            const rightDiv = document.createElement('div');
            rightDiv.className = 'flex items-center space-x-2';
            const timeSpan = document.createElement('span');
            const totalTime = calculateTaskTotalTime(task);
            timeSpan.textContent = formatTime(totalTime);
            rightDiv.appendChild(timeSpan);
            const todayBtn = createTodayButton(task, (e) => {
                e.stopPropagation();
                e.preventDefault();
                const originalTask = findTaskByIdGlobal(task.id);
                if (originalTask) {
                    originalTask.inToday = !originalTask.inToday;
                    if (originalTask.inToday && originalTask.dailyGoal === 0) {
                        originalTask.dailyGoal = 1;
                    }
                    todayBtn.innerHTML = originalTask.inToday ? '🌞' : '☀️';
                    todayBtn.classList.toggle('bg-yellow-100', originalTask.inToday);
                    saveData();
                    renderTaskList();
                    renderDashboard();
                    renderProjectList();
                }
            });
            const weekBtn = document.createElement('button');
            weekBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            weekBtn.innerHTML = task.inWeek ? '📅' : '📆';
            weekBtn.classList.toggle('bg-blue-100', task.inWeek);
            weekBtn.title = task.inWeek ? 'Remove from Weekly Tasks' : 'Add to Weekly Tasks';
            weekBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const originalTask = findTaskByIdGlobal(task.id);
                if (originalTask) {
                    originalTask.inWeek = !originalTask.inWeek;
                    weekBtn.innerHTML = originalTask.inWeek ? '📅' : '📆';
                    weekBtn.classList.toggle('bg-blue-100', originalTask.inWeek);
                    saveData();
                    renderTaskList();
                    renderDashboard();
                    renderProjectList();
                }
            });
            rightDiv.appendChild(todayBtn);
            rightDiv.appendChild(weekBtn);
            const editBtn = document.createElement('button');
            editBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            editBtn.innerHTML = `
                <svg class="h-4 w-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            `;
            editBtn.addEventListener('click', () => {
                openTaskSettings(task);
            });
            rightDiv.appendChild(editBtn);
            const timerBtn = createTimerButton(task, () => startPomodoro(task));
            rightDiv.appendChild(timerBtn);

            const addTimeBtn = document.createElement('button');
            addTimeBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            addTimeBtn.innerHTML = `
                <svg class="h-4 w-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            `;
            addTimeBtn.addEventListener('click', () => openTimeEntryModal(task));
            rightDiv.appendChild(addTimeBtn);

            const timeLogBtn = document.createElement('button');
            timeLogBtn.className = 'p-1.5 border rounded-lg hover:bg-gray-100 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            timeLogBtn.innerHTML = `
                <svg class="h-4 w-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
                </svg>
            `;
            timeLogBtn.addEventListener('click', () => showTimeLog(task));
            rightDiv.appendChild(timeLogBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'p-1.5 border rounded-lg text-red-500 hover:bg-red-50 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-700';
            deleteBtn.innerHTML = `
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M6 18L18 18M9 18L9 9M15 18L15 9M5 7L19 7M10 7L10 4H14L14 7" />
                </svg>
            `;
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this task?')) {
                    deleteTask(task.id);
                }
            });
            rightDiv.appendChild(deleteBtn);
            taskDiv.appendChild(rightDiv);
            container.appendChild(taskDiv);
            if (task.isExpanded) {
                const subtasksDiv = document.createElement('div');
                if (task.subtasks && task.subtasks.length > 0) {
                    const filteredSubtasks = filterTasks(task.subtasks, searchTerm);
                    filteredSubtasks.forEach(subtask => {
                        const subtaskElement = createTaskElement(subtask, level + 1);
                        subtasksDiv.appendChild(subtaskElement);
                    });
                }
                container.appendChild(subtasksDiv);
                const addSubtaskDiv = document.createElement('div');
                addSubtaskDiv.style.marginLeft = `${(level + 1) * 16}px`;
                addSubtaskDiv.className = 'mt-2';
                const subtaskInput = document.createElement('input');
                subtaskInput.type = 'text';
                subtaskInput.placeholder = '+ subtask';
                subtaskInput.className = 'mb-2 p-2 border rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400';
                subtaskInput.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const title = subtaskInput.value.trim();
                        if (title) {
                            const input = e.target;
                            await addTask(task.id, title);
                            if (document.activeElement === input && input.value === title) {
                                input.value = '';
                            }
                        }
                    }
                });
                addSubtaskDiv.appendChild(subtaskInput);
                container.appendChild(addSubtaskDiv);
            }
            return container;
        }

        function toggleTaskCompletion(taskId) {
            const task = findTaskById(selectedProject.tasks, taskId);
            if (task) {
                task.isCompleted = !task.isCompleted;
                task.progress = task.isCompleted ? 100 : 0;
                traverseTasks(task.subtasks, (subtask) => {
                    subtask.isCompleted = task.isCompleted;
                    subtask.progress = task.isCompleted ? 100 : 0;
                });
                saveData();
                renderTaskList();
                renderProjectList();
                initGanttChart(); // Refresh Gantt chart after toggling completion
            }
        }

        function toggleTaskExpand(taskId) {
            const task = findTaskById(selectedProject.tasks, taskId);
            if (task) {
                task.isExpanded = !task.isExpanded;
                saveData();
                renderTaskList();
            }
        }

        function startPomodoro(task) {
            if (currentPomodoroTask) {
                stopPomodoro();
            }
            currentPomodoroTask = task;
            task.isTimerRunning = true;
            isPomodoroRunning = true;

            // Ensure display is visible
            document.getElementById('pomodoro-display').classList.remove('hidden');
            const settings = JSON.parse(localStorage.getItem('settings')) || {};
            pomodoroDuration = task.pomodoroDuration || settings.pomodoroDuration || parseInt(document.getElementById('pomodoro-duration').value) || 25;
            pomodoroStartTime = Date.now();
            pomodoroElapsedTime = 0;
            document.getElementById('current-task-title').textContent = task.title;

            updatePomodoroTimer();
            pomodoroTimer = setInterval(updatePomodoroTimer, 100);

            // Setup button handlers
            document.getElementById('stop-pomodoro').onclick = stopPomodoro;
            document.getElementById('pause-pomodoro').onclick = pausePomodoro;
            document.getElementById('resume-pomodoro').onclick = resumePomodoro;
            document.getElementById('toggle-count-mode').onclick = toggleCountMode;

            // Show pause button, hide resume
            document.getElementById('pause-pomodoro').classList.remove('hidden');
            document.getElementById('resume-pomodoro').classList.add('hidden');

            saveData();
            renderTaskList();
        }

        function stopPomodoro() {
            if (currentPomodoroTask && pomodoroStartTime) {
                const endTime = Date.now();
                const elapsedSeconds = Math.floor((endTime - pomodoroStartTime) / 1000);
                const startTime = new Date(pomodoroStartTime);
                const timeEntry = {
                    start: startTime.toISOString(),
                    end: new Date(endTime).toISOString(),
                    duration: elapsedSeconds
                };
                const task = findTaskByIdGlobal(currentPomodoroTask.id);
                if (task) {
                    task.timeSpent += timeEntry.duration;
                    task.isTimerRunning = false;
                    if (!task.timeEntries) {
                        task.timeEntries = [];
                    }
                    task.timeEntries.push(timeEntry);
                    if (task.inToday) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        let todayTimeSpent = 0;
                        task.timeEntries.forEach(entry => {
                            const entryDate = new Date(entry.start);
                            if (entryDate >= today) {
                                todayTimeSpent += entry.duration;
                            }
                        });
                        task.dailyProgress = Math.floor(todayTimeSpent / 60 / (parseInt(document.getElementById('pomodoro-duration').value) || 25));
                        saveData();
                        renderDashboard();
                    }
                }
                lastCompletedTask = currentPomodoroTask; // Store for starting new session
                currentPomodoroTask = null;
                pomodoroStartTime = null;
            }
            if (pomodoroTimer) {
                clearInterval(pomodoroTimer);
                pomodoroTimer = null;
            }
            document.getElementById('pomodoro-display').classList.add('hidden');
            removePomodoroState();
            saveData();
            renderTaskList();
            renderProjectList();
        }

        function updatePomodoroTimer() {
            const now = Date.now();
            if (isPomodoroCountUp) {
                // Count up mode
                pomodoroElapsedTime = Math.floor((now - pomodoroStartTime) / 1000);
                const minutes = Math.floor(pomodoroElapsedTime / 60);
                const seconds = pomodoroElapsedTime % 60;
                document.getElementById('pomodoro-timer').textContent =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                // Count down mode
                const endTime = pomodoroStartTime + (pomodoroDuration * 60 * 1000);
                const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                document.getElementById('pomodoro-timer').textContent =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                if (timeLeft <= 0 && isPomodoroRunning) {
                    pomodoroComplete();
                }
            }
            // Save the current timer state
            if (isPomodoroRunning) {
                savePomodoroState();
            }
        }

        function pausePomodoro() {
            if (pomodoroTimer) {
                clearInterval(pomodoroTimer);
                isPomodoroRunning = false;
                pomodoroPausedTime = Date.now();
                document.getElementById('pause-pomodoro').classList.add('hidden');
                document.getElementById('resume-pomodoro').classList.remove('hidden');
                savePomodoroState();
            }
        }

        function resumePomodoro() {
            if (pomodoroPausedTime) {
                const pauseDuration = Date.now() - pomodoroPausedTime;
                pomodoroStartTime += pauseDuration;
                isPomodoroRunning = true;
                pomodoroTimer = setInterval(updatePomodoroTimer, 100);
                document.getElementById('pause-pomodoro').classList.remove('hidden');
                document.getElementById('resume-pomodoro').classList.add('hidden');
                pomodoroPausedTime = null;
                savePomodoroState();
            }
        }

        function toggleCountMode() {
            isPomodoroCountUp = !isPomodoroCountUp;
            pomodoroStartTime = Date.now();
            pomodoroElapsedTime = 0;
            // Use valid FontAwesome icons
            document.getElementById('toggle-count-mode').innerHTML =
                `<i class="fas fa-${isPomodoroCountUp ? 'hourglass-start' : 'clock'}"></i>`;
            savePomodoroState();
        }

        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            document.documentElement.classList.toggle('dark');
            const icon = document.getElementById('dark-mode-icon');
            if (isDarkMode) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
            renderWeeklyChart();
        }

        function showReport() {
            if (!selectedProject) {
                alert('Please select a project to view the report.');
                return;
            }
            const reportModal = document.getElementById('report-modal');
            const reportContent = document.getElementById('report-content');
            const totalTime = calculateTotalTime(selectedProject.tasks);
            const completedTasks = countTasks(selectedProject.tasks, true);
            const ongoingTasks = countTasks(selectedProject.tasks, false);
            reportContent.innerHTML = `
                <p>Total time spent on tasks: ${formatTime(totalTime)}</p>
                <p>Number of completed tasks: ${completedTasks}</p>
                <p>Number of ongoing tasks: ${ongoingTasks}</p>
            `;
            reportModal.classList.remove('hidden');
        }

        function hideReport() {
            const reportModal = document.getElementById('report-modal');
            reportModal.classList.add('hidden');
        }

        function calculateTotalTime(tasks) {
            let total = 0;
            traverseTasks(tasks, task => {
                total += task.timeSpent;
            });
            return total;
        }

        function countTasks(tasks, isCompleted) {
            let count = 0;
            traverseTasks(tasks, task => {
                if (task.isCompleted === isCompleted) {
                    count += 1;
                }
            });
            return count;
        }

        function calculateProjectProgress(tasks) {
            const totalTasks = countTasks(tasks, true) + countTasks(tasks, false);
            const completedTasks = countTasks(tasks, true);
            return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
        }

        function calculateProjectTotalTime(tasks) {
            return calculateTotalTime(tasks);
        }

        function calculateTaskTotalTime(task) {
            let total = task.timeSpent;
            if (task.subtasks && task.subtasks.length > 0) {
                total += calculateTotalTime(task.subtasks);
            }
            return total;
        }

        function savePomodoroState() {
            const state = {
                currentPomodoroTaskId: currentPomodoroTask ? currentPomodoroTask.id : null,
                pomodoroStartTime: pomodoroStartTime,
                isPomodoroCountUp: isPomodoroCountUp,
                pomodoroDuration: pomodoroDuration,
                isPomodoroRunning: isPomodoroRunning
            };
            localStorage.setItem('pomodoroTimerState', JSON.stringify(state));
        }

        function removePomodoroState() {
            localStorage.removeItem('pomodoroTimerState');
        }

        function formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hours}h ${minutes}m ${secs}s`;
        }

        function findTaskById(tasks, taskId) {
            for (let task of tasks) {
                if (task.id === taskId) {
                    return task;
                }
                if (task.subtasks && task.subtasks.length > 0) {
                    let result = findTaskById(task.subtasks, taskId);
                    if (result) return result;
                }
            }
            return null;
        }

        function findTaskByIdGlobal(taskId) {
            for (let project of projects) {
                const task = findTaskById(project.tasks, taskId);
                if (task) return task;
            }
            return null;
        }

        function getTaskPath(taskId) {
            const path = [];
            function findPath(tasks, targetId, currentPath = []) {
                for (let task of tasks) {
                    if (task.id === targetId) {
                        return [...currentPath, task.title];
                    }
                    if (task.subtasks && task.subtasks.length > 0) {
                        const result = findPath(task.subtasks, targetId, [...currentPath, task.title]);
                        if (result) return result;
                    }
                }
                return null;
            }
            for (let project of projects) {
                const result = findPath(project.tasks, taskId);
                if (result) {
                    path.push(...result);
                    break;
                }
            }
            return path;
        }

        function removeTaskById(tasks, taskId) {
            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].id === taskId) {
                    tasks.splice(i, 1);
                    return true;
                }
                if (tasks[i].subtasks && tasks[i].subtasks.length > 0) {
                    const found = removeTaskById(tasks[i].subtasks, taskId);
                    if (found) return true;
                }
            }
            return false;
        }

        function traverseTasks(tasks, callback) {
            for (let task of tasks) {
                callback(task);
                if (task.subtasks && task.subtasks.length > 0) {
                    traverseTasks(task.subtasks, callback);
                }
            }
        }

        function showSettings() {
            document.getElementById('settings-modal').classList.remove('hidden');
        }

        function hideSettings() {
            document.getElementById('settings-modal').classList.add('hidden');
        }

        function saveSettings() {
            const settings = {
                silenceMode: document.getElementById('silence-mode').checked,
                pomodoroDuration: parseInt(document.getElementById('pomodoro-duration').value) || 25,
                soundType: document.getElementById('sound-select').value,
                soundUrl: timerSound.src
            };
            localStorage.setItem('settings', JSON.stringify(settings));
        }

        function handleSoundSelection(e) {
            const customSoundInput = document.getElementById('custom-sound-input');
            if (e.target.value === 'custom') {
                customSoundInput.classList.remove('hidden');
            } else {
                customSoundInput.classList.add('hidden');
                timerSound.src = 'https://www.soundjay.com/buttons/sounds/beep-07a.mp3';
                saveSettings();
            }
        }

        function testSound() {
            timerSound.currentTime = 0;
            timerSound.play().catch(error => {
                console.error("Error playing sound:", error);
            });
            setTimeout(() => {
                timerSound.pause();
                timerSound.currentTime = 0;
            }, 2000);
        }

        document.getElementById('custom-sound-file').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                if (timerSound.dataset.objectUrl) {
                    URL.revokeObjectURL(timerSound.dataset.objectUrl);
                }
                const url = URL.createObjectURL(file);
                timerSound.src = url;
                timerSound.dataset.objectUrl = url;
                saveSettings();
            }
        });

        function pomodoroComplete() {
            stopPomodoro();
            document.getElementById('timer-complete-modal').classList.remove('hidden');

            const silenceMode = document.getElementById('silence-mode').checked;

            if (silenceMode) {
                // Show notification
                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification('Pomodoro Complete!', {
                            body: 'Your pomodoro session has finished.',
                        });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission().then(permission => {
                            if (permission === 'granted') {
                                new Notification('Pomodoro Complete!', {
                                    body: 'Your pomodoro session has finished.',
                                });
                            }
                        });
                    }
                }
            } else {
                // Play sound
                timerSound.play().catch(error => {
                    console.error("Error playing sound:", error);
                });
            }
        }

        function closeTimerComplete() {
            document.getElementById('timer-complete-modal').classList.add('hidden');
            timerSound.pause();
            timerSound.currentTime = 0;
        }

        function startNewSession() {
            closeTimerComplete();
            if (lastCompletedTask) {
                document.getElementById('pomodoro-display').classList.remove('hidden');
                currentPomodoroTask = null;
                startPomodoro(lastCompletedTask);
                lastCompletedTask = null;
            }
        }

        document.getElementById('start-new-session').addEventListener('click', startNewSession);

        // Add Gantt chart instance variable
        let ganttChart = null;

        function initGanttChart() {
            const ganttTasks = [];
            
            function processTask(task, level = 0) {
                const ganttTask = {
                    id: task.id,
                    name: task.title,
                    start: task.start,
                    end: task.end,
                    progress: task.progress,
                    dependencies: '',
                    custom_class: task.isCompleted ? 'completed' : ''
                };
                ganttTasks.push(ganttTask);
                
                task.subtasks.forEach(subtask => processTask(subtask, level + 1));
            }
            
            if (selectedProject) {
                selectedProject.tasks.forEach(task => processTask(task));
            }

            const ganttContainer = document.getElementById('gantt');
            if (!ganttContainer) return;
            
            // Clear existing chart if it exists
            ganttContainer.innerHTML = '';
            
            try {
                if (ganttChart) {
                    ganttChart.refresh(ganttTasks);
                } else {
                    ganttChart = new Gantt("#gantt", ganttTasks, {
                        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                        view_mode: 'Day',
                        date_format: 'YYYY-MM-DD',
                        on_click: task => {
                            const originalTask = findTaskByIdGlobal(task.id);
                            if (originalTask) {
                                openTaskSettings(originalTask);
                            }
                        },
                        on_date_change: (task, start, end) => {
                            const originalTask = findTaskByIdGlobal(task.id);
                            if (originalTask) {
                                originalTask.start = start.toISOString().split('T')[0];
                                originalTask.end = end.toISOString().split('T')[0];
                                saveData();
                                renderTaskList();
                            }
                        },
                        on_progress_change: (task, progress) => {
                            const originalTask = findTaskByIdGlobal(task.id);
                            if (originalTask) {
                                originalTask.progress = progress;
                                if (progress === 100) {
                                    originalTask.isCompleted = true;
                                }
                                saveData();
                                renderTaskList();
                            }
                        },
                        custom_popup_html: task => {
                            const originalTask = findTaskByIdGlobal(task.id);
                            if (!originalTask) return '';
                            
                            const startDate = new Date(task.start).toLocaleDateString();
                            const endDate = new Date(task.end).toLocaleDateString();
                            const timeSpent = formatTime(originalTask.timeSpent);
                            
                            return `
                                <div class="p-2 bg-white dark:bg-gray-800 rounded shadow-lg border dark:border-gray-700">
                                    <h3 class="font-bold mb-2 dark:text-gray-200">${task.name}</h3>
                                    <div class="text-sm dark:text-gray-300">
                                        <p>Start: ${startDate}</p>
                                        <p>End: ${endDate}</p>
                                        <p>Progress: ${task.progress}%</p>
                                        <p>Time Spent: ${timeSpent}</p>
                                    </div>
                                </div>
                            `;
                        }
                    });
                }
            } catch (error) {
                console.error('Error initializing Gantt chart:', error);
                return;
            }

            // Add zoom controls
            document.getElementById('zoom-in-btn').onclick = () => {
                const modes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'];
                const currentMode = ganttChart.options.view_mode;
                const currentIndex = modes.indexOf(currentMode);
                if (currentIndex > 0) {
                    ganttChart.change_view_mode(modes[currentIndex - 1]);
                }
            };

            document.getElementById('zoom-out-btn').onclick = () => {
                const modes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'];
                const currentMode = ganttChart.options.view_mode;
                const currentIndex = modes.indexOf(currentMode);
                if (currentIndex < modes.length - 1) {
                    ganttChart.change_view_mode(modes[currentIndex + 1]);
                }
            };

            document.getElementById('today-btn').onclick = () => {
                ganttChart.scroll_to_today();
            };
        }

        // Modify selectProject function to initialize Gantt chart
        function selectProject(projectId) {
            selectedProject = projects.find(p => p.id === projectId);
            document.getElementById('project-title').textContent = selectedProject.name;
            document.getElementById('dashboard-view').classList.add('hidden');
            document.getElementById('project-view').classList.remove('hidden');
            renderProjectList();
            renderTaskList();
            initGanttChart(); // Initialize Gantt chart when project is selected
        }

        // Modify task settings modal to include date inputs
        function openTaskSettings(task) {
            currentEditingTask = task;
            document.getElementById('task-name-input').value = task.title;
            document.getElementById('task-billable').checked = task.isBillable || false;
            document.getElementById('task-rate').value = task.hourlyRate || 0;
            document.getElementById('task-pomodoro-duration').value = task.pomodoroDuration || '';
            document.getElementById('rate-input-container').classList.toggle('hidden', !task.isBillable);
            
            // Add date inputs to the modal
            const modalContent = document.querySelector('#task-settings-modal .space-y-4');
            if (!document.getElementById('task-dates-container')) {
                const datesContainer = document.createElement('div');
                datesContainer.id = 'task-dates-container';
                datesContainer.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block mb-2">Start Date</label>
                            <input type="date" id="task-start-date" 
                                class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        </div>
                        <div>
                            <label class="block mb-2">End Date</label>
                            <input type="date" id="task-end-date"
                                class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        </div>
                    </div>
                `;
                modalContent.insertBefore(datesContainer, document.getElementById('rate-input-container'));
            }
            
            document.getElementById('task-start-date').value = task.start;
            document.getElementById('task-end-date').value = task.end;
            
            document.getElementById('task-settings-modal').classList.remove('hidden');
        }

        // Modify saveTaskSettings to save dates
        function saveTaskSettings() {
            if (currentEditingTask) {
                const newTitle = document.getElementById('task-name-input').value.trim();
                const isBillable = document.getElementById('task-billable').checked;
                const hourlyRate = parseFloat(document.getElementById('task-rate').value) || 0;
                const pomodoroDuration = parseInt(document.getElementById('task-pomodoro-duration').value) || 0;
                const startDate = document.getElementById('task-start-date').value;
                const endDate = document.getElementById('task-end-date').value;

                if (newTitle) {
                    const task = findTaskByIdGlobal(currentEditingTask.id);
                    if (task) {
                        task.title = newTitle;
                        task.isBillable = isBillable;
                        task.hourlyRate = hourlyRate;
                        task.pomodoroDuration = pomodoroDuration || null;
                        task.start = startDate;
                        task.end = endDate;
                        saveData();
                        renderTaskList();
                        initGanttChart(); // Refresh Gantt chart after saving
                    }
                }
            }
            closeTaskSettings();
        }

        // Modify addTask to include start and end dates
        async function addTask(parentId = null, customTitle = null) {
            const title = customTitle || document.getElementById('new-task-title').value.trim();
            if (title && selectedProject) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // Default duration: 1 week

                const newTask = {
                    id: generateId(),
                    title: title,
                    timeSpent: 0,
                    isTimerRunning: false,
                    isExpanded: false,
                    isCompleted: false,
                    subtasks: [],
                    canHaveSubtasks: true,
                    inToday: false,
                    dailyGoal: 0,
                    dailyProgress: 0,
                    isBillable: false,
                    hourlyRate: 0,
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0],
                    _progress: 0,
                    get progress() {
                        return this._progress;
                    },
                    set progress(value) {
                        this._progress = value;
                    },
                };

                // If this is a subtask, inherit from parent task
                if (parentId) {
                    const parentTask = findTaskById(selectedProject.tasks, parentId);
                    if (parentTask && parentTask.isBillable) {
                        newTask.isBillable = true;
                        newTask.hourlyRate = parentTask.hourlyRate;
                    }
                } 
                // If this is a top-level task, inherit from project
                else if (selectedProject.isBillable) {
                    newTask.isBillable = true;
                    newTask.hourlyRate = selectedProject.hourlyRate;
                }

                if (parentId) {
                    const parentTask = findTaskById(selectedProject.tasks, parentId);
                    if (parentTask) {
                        parentTask.subtasks.push(newTask);
                    }
                } else {
                    selectedProject.tasks.push(newTask);
                }
                saveData();
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        renderTaskList();
                        renderProjectList();
                        initGanttChart(); // Refresh Gantt chart after adding task
                        resolve();
                    });
                });
                if (!customTitle) {
                    document.getElementById('new-task-title').value = '';
                }
            }
        }

        init();