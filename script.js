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

        