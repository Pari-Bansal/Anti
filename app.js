document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    // DOM References
    const onboardingView = document.getElementById('onboarding-view');
    const mainView = document.getElementById('main-view');
    const onboardingForm = document.getElementById('onboarding-form');
    
    // State
    let user = JSON.parse(localStorage.getItem('nutribot_user')) || null;
    let foods = JSON.parse(localStorage.getItem('nutribot_foods')) || [];
    let journal = JSON.parse(localStorage.getItem('nutribot_journal')) || [];
    let steps = parseInt(localStorage.getItem('nutribot_steps')) || 0;
    let habitDone = localStorage.getItem('nutribot_habit') === 'true';
    
    // Initialize
    if (user) {
        initDashboard();
    } else {
        onboardingView.classList.add('active');
    }

    // Onboarding Submit
    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        user = {
            name: document.getElementById('userName').value,
            age: document.getElementById('userAge').value,
            sleep: document.getElementById('userSleep').value,
            height: document.getElementById('userHeight').value,
            weight: document.getElementById('userWeight').value,
            conditions: document.getElementById('userConditions').value
        };
        saveState();
        logToJournal('Started using NutriBot!');
        initDashboard();
    });

    function saveState() {
        localStorage.setItem('nutribot_user', JSON.stringify(user));
        localStorage.setItem('nutribot_foods', JSON.stringify(foods));
        localStorage.setItem('nutribot_journal', JSON.stringify(journal));
        localStorage.setItem('nutribot_steps', steps.toString());
        localStorage.setItem('nutribot_habit', habitDone.toString());
    }

    function initDashboard() {
        onboardingView.classList.remove('active');
        mainView.classList.add('active');
        document.getElementById('display-name').textContent = user.name;
        
        // Date
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        document.getElementById('header-date').textContent = new Date().toLocaleDateString(undefined, options);

        // Circadian Logic
        const circEl = document.getElementById('circadian-suggestion');
        if (circEl) {
            if (user.sleep === 'early') {
                circEl.innerHTML = `Based on your Early Bird schedule, optimal dinner time is <strong>6:30 PM</strong> to maximize insulin sensitivity.`;
            } else if (user.sleep === 'night') {
                circEl.innerHTML = `As a Night Owl, try having your last heavy meal before <strong>8:30 PM</strong> to avoid disrupting sleep architecture.`;
            } else {
                circEl.innerHTML = `With an irregular schedule, aim for a <strong>12-hour fasting window</strong> overnight to reset your rhythm.`;
            }
        }

        updateMetrics();
        renderWeeklyChart();
        renderJournal();
        fillProfileForm();
    }

    // Tab Navigation Logic
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const tabContents = document.querySelectorAll('.main-content .tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-tab');
            tabContents.forEach(tab => {
                tab.classList.toggle('active', tab.id === targetId);
            });
        });
    });

    // Rule of One Logic
    const btnHabit = document.getElementById('btn-habit-done');
    if (btnHabit) {
        btnHabit.addEventListener('click', () => {
            habitDone = true;
            saveState();
            logToJournal('Completed Daily Habit: Water before meals.');
            updateMetrics();
        });
    }

    // Pedometer Logic
    function updateMetrics() {
        document.getElementById('val-steps').textContent = steps.toLocaleString();
        
        // Heart points: 1 point per 100 steps
        const heartPts = Math.floor(steps / 100);
        document.getElementById('val-heart').textContent = heartPts;
        
        // Energy: rough estimate 0.04 calories per step
        const calories = Math.floor(steps * 0.04);
        document.getElementById('val-energy').innerHTML = `${calories} <span style="font-size:1rem; font-weight:500;">kcal</span>`;
        
        // Habit Button State
        if (btnHabit && habitDone) {
            btnHabit.textContent = "Awesome, you did it today! 🎉";
            btnHabit.style.backgroundColor = 'var(--primary-color)';
            btnHabit.style.color = 'white';
            btnHabit.disabled = true;
        }

        // Macros and Goal Ring
        const hasHealthy = foods.some(f => f.healthy);
        const streakMsg = document.getElementById('streak-message');
        
        if(foods.length > 0) {
            document.getElementById('val-macros').textContent = hasHealthy ? 'Good' : 'Needs Fiber';
            if (streakMsg) {
                if (hasHealthy) {
                    streakMsg.textContent = "Amazing job! You've logged healthy choices today. You're hitting your goals and your body thanks you! Keep this streak going.";
                } else {
                    streakMsg.textContent = "You logged some treats today! No worries, balance is key. Let's make sure your next meal is packed with nutrients.";
                }
            }
        } else {
            document.getElementById('val-macros').textContent = 'Pending';
            if (streakMsg) streakMsg.textContent = "Log your first meal below to see your analysis and streak!";
        }

        // Goal Ring = Healthy Food + Habit Done
        if (hasHealthy && habitDone) {
            document.getElementById('goal-ring').classList.add('goal-met');
        } else {
            document.getElementById('goal-ring').classList.remove('goal-met');
        }
    }

    // Real device motion listener for mobile
    let lastZ = 0;
    window.addEventListener('devicemotion', (e) => {
        let acc = e.accelerationIncludingGravity;
        if(acc && acc.z) {
            let delta = Math.abs(lastZ - acc.z);
            if(delta > 3) { // Step threshold
                steps++;
                saveState();
                updateMetrics();
            }
            lastZ = acc.z;
        }
    });

    // Simulate Walking Button for Desktop
    const btnSimSteps = document.getElementById('btn-sim-steps');
    let simInterval = null;
    btnSimSteps.addEventListener('click', () => {
        if(simInterval) {
            clearInterval(simInterval);
            simInterval = null;
            btnSimSteps.innerHTML = `<i data-feather="play"></i> Simulate Walking`;
            logToJournal(`Finished a walk session. Total steps: ${steps}`);
        } else {
            simInterval = setInterval(() => {
                steps += Math.floor(Math.random() * 5) + 1; // 1 to 5 steps
                saveState();
                updateMetrics();
            }, 500);
            btnSimSteps.innerHTML = `<i data-feather="square"></i> Stop Walking`;
        }
        feather.replace();
    });

    // Food Logging
    const foodInput = document.getElementById('food-input');
    const btnAddFood = document.getElementById('btn-add-food');

    btnAddFood.addEventListener('click', () => {
        const foodStr = foodInput.value.trim();
        if(!foodStr) return;
        
        const isHealthy = foodStr.toLowerCase().match(/(salad|apple|chicken|broccoli|water|oats)/);
        foods.push({ text: foodStr, healthy: !!isHealthy });
        saveState();
        
        logToJournal(`Logged food: ${foodStr}`);
        updateMetrics();
        renderWeeklyChart();
        foodInput.value = '';
    });

    // Weekly Chart Mock
    function renderWeeklyChart() {
        const chartContainer = document.getElementById('weekly-chart-bars');
        chartContainer.innerHTML = '';
        const mockDays = [
            { day: 'Mon', value: 0.8, type: 'healthy' },
            { day: 'Tue', value: 0.4, type: 'moderate' },
            { day: 'Wed', value: 0.9, type: 'healthy' },
            { day: 'Thu', value: 0.7, type: 'healthy' },
            { day: 'Fri', value: 0.3, type: 'moderate' },
            { day: 'Sat', value: 0.8, type: 'healthy' },
        ];
        
        let todayVal = 0.1, todayType = 'moderate';
        if(foods.length > 0) {
            if(foods.some(f => f.healthy)) { todayVal = 0.9; todayType = 'healthy'; }
            else { todayVal = 0.5; todayType = 'moderate'; }
        }
        mockDays.push({ day: 'Today', value: todayVal, type: todayType });

        mockDays.forEach(data => {
            const group = document.createElement('div');
            group.className = 'bar-group';
            const bar = document.createElement('div');
            bar.className = `bar ${data.type}`;
            setTimeout(() => { bar.style.height = `${data.value * 100}%`; }, 50);
            const label = document.createElement('span');
            label.className = 'day-label';
            label.textContent = data.day;
            group.appendChild(bar); group.appendChild(label); chartContainer.appendChild(group);
        });
    }

    // Journal Logic
    function logToJournal(text) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        journal.unshift({ text, time });
        saveState();
        renderJournal();
    }

    function renderJournal() {
        const feed = document.getElementById('journal-feed');
        if(journal.length === 0) return;
        feed.innerHTML = '';
        journal.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'journal-item slide-up';
            div.innerHTML = `
                <div class="journal-time">${entry.time}</div>
                <div class="journal-content">${entry.text}</div>
            `;
            feed.appendChild(div);
        });
    }

    // Profile Logic
    const profileForm = document.getElementById('profile-form');
    function fillProfileForm() {
        if(!user) return;
        document.getElementById('prof-name').value = user.name;
        document.getElementById('prof-age').value = user.age;
        document.getElementById('prof-weight').value = user.weight;
        document.getElementById('prof-height').value = user.height;
        document.getElementById('prof-conditions').value = user.conditions;
    }
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        user.name = document.getElementById('prof-name').value;
        user.age = document.getElementById('prof-age').value;
        user.weight = document.getElementById('prof-weight').value;
        user.height = document.getElementById('prof-height').value;
        user.conditions = document.getElementById('prof-conditions').value;
        saveState();
        logToJournal('Updated profile information.');
        document.getElementById('display-name').textContent = user.name;
        alert('Profile saved successfully!');
    });

    // Overlays (Camera / Chat)
    const fabContainer = document.getElementById('fab-container');
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    const cameraView = document.getElementById('camera-view');
    const chatView = document.getElementById('chat-view');

    fabMain.addEventListener('click', () => {
        fabContainer.classList.toggle('active');
        fabMenu.classList.toggle('open');
    });

    document.getElementById('fab-camera').addEventListener('click', () => {
        cameraView.classList.add('active');
        fabContainer.classList.remove('active'); fabMenu.classList.remove('open');
    });
    document.getElementById('btn-close-camera').addEventListener('click', () => cameraView.classList.remove('active'));

    document.getElementById('fab-chat').addEventListener('click', () => {
        chatView.classList.add('active');
        fabContainer.classList.remove('active'); fabMenu.classList.remove('open');
    });
    document.getElementById('btn-close-chat').addEventListener('click', () => chatView.classList.remove('active'));

    // Camera Scan Action
    document.getElementById('btn-start-scan').addEventListener('click', (e) => {
        e.target.disabled = true;
        document.querySelector('.scanner-line').style.display = 'block';
        setTimeout(() => {
            document.querySelector('.scanner-line').style.display = 'none';
            document.getElementById('scan-results').style.display = 'block';
            e.target.style.display = 'none';
        }, 2000);
    });
    document.getElementById('btn-log-scan').addEventListener('click', () => {
        logToJournal('Scanned plate: Grilled Salmon, Quinoa, Asparagus.');
        cameraView.classList.remove('active');
        alert('Meal logged from scan!');
    });

    // Advanced Chatbot
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const chatMessages = document.getElementById('chat-messages');

    function appendMsg(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender} slide-up`;
        div.innerHTML = `<div class="msg-bubble">${text}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleChat() {
        const text = chatInput.value.trim();
        if(!text) return;
        appendMsg(text, 'user');
        chatInput.value = '';
        
        const lower = text.toLowerCase();
        setTimeout(() => {
            let res = "That's a great question! Based on your profile, you're doing well. Keep up the good work!";
            
            if(lower.includes('overview') || lower.includes('daily') || lower.includes('weekly')) {
                res = `**Your Overview:** You have taken ${steps} steps today, burning roughly ${Math.floor(steps*0.04)} kcal. You have logged ${foods.length} foods. Your weekly consistency is looking strong, keep focusing on fiber!`;
            } else if(lower.includes('donut') || lower.includes('sugar') || lower.includes('pizza') || lower.includes('burger')) {
                const cond = user.conditions.toLowerCase();
                if(cond.includes('diabet')) {
                    res = "I do **not recommend** eating that right now due to your diabetes. The sugar spike will crash your energy.<br><br>**Instead, try:** A bowl of Greek yogurt with berries or an apple with peanut butter to keep your blood sugar stable!";
                } else {
                    res = "While you *can* eat that, it's very low in nutrients and high in calories.<br><br>**A better alternative:** If you're craving something sweet or heavy, try a protein-packed smoothie or a homemade oat cookie. It satisfies the craving but fuels your body!";
                }
            } else if (lower.includes('salad') || lower.includes('chicken')) {
                res = "Yes, absolutely! That perfectly aligns with your health goals. Enjoy your meal!";
            }
            appendMsg(res, 'bot');
        }, 800);
    }
    btnSend.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });
});
