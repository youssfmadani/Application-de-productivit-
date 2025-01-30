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

       