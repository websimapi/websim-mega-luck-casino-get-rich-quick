class MegaLuckCasino {
    constructor() {
        this.realMoney = 10000;
        this.coins = 0;
        this.luck = 1;
        this.subscription = null;
        this.ownedGloves = new Set();
        this.cancelAttempts = 0;
        this.gameInitialized = false;
        
        this.gameStartTime = null;
        this.currentInGameDay = 1;
        this.currentInGameMonth = 1;
        this.lastMonthProcessedForRate = 0;
        this.isNight = false;
        this.timeUpdateInterval = null;

        this.gloves = [
            { id: 'basic', name: 'Basic Gloves', luck: 2, cost: 10, rarity: 'common' },
            { id: 'lucky', name: 'Lucky Gloves', luck: 5, cost: 50, rarity: 'rare' },
            { id: 'golden', name: 'Golden Gloves', luck: 10, cost: 150, rarity: 'epic' },
            { id: 'rainbow', name: 'Rainbow Gloves', luck: 20, cost: 500, rarity: 'legendary' },
            { id: 'cosmic', name: 'Cosmic Gloves', luck: 50, cost: 1000, rarity: 'mythic' }
        ];
        
        this.slots = ['🍎', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑', '💎', '⭐', '🍀'];
        this.winMessages = [
            "🎉 JACKPOT! You're on fire!",
            "💰 Big win! Your luck is incredible!",
            "🌟 Amazing! The stars align for you!",
            "🔥 Hot streak! Keep going!",
            "💎 Diamond luck! Fantastic!"
        ];
        
        this.showDisclaimer();
    }

    showDisclaimer() {
        const disclaimerContainer = document.getElementById('disclaimer-popup-container');
        disclaimerContainer.style.display = 'flex';

        const overlay = document.createElement('div');
        overlay.className = 'disclaimer-overlay';

        const popup = document.createElement('div');
        popup.className = 'disclaimer-popup';
        
        popup.innerHTML = `
            <h2>🚨 Important Disclaimer 🚨</h2>
            <p>This game is a simulation for <strong>entertainment purposes only</strong>.</p>
            <p>No real money or prizes are involved, and <strong>no real money can be won or lost</strong>.</p>
            <p>All credits or coins used in this game are virtual and have <strong>no monetary value</strong>.</p>
            <p>This game is <strong>not intended for real gambling</strong> and is designed solely for fun and practice.</p>
            <p>By playing, you acknowledge that this is a game of chance with <strong>no real financial stakes</strong>.</p>
            <p>Please play responsibly and ensure you meet your local age requirements for gambling-related content.</p>
            <div class="popup-buttons">
                <button class="popup-btn confirm" id="accept-disclaimer-btn">I Understand & Agree</button>
            </div>
        `;

        disclaimerContainer.appendChild(overlay);
        disclaimerContainer.appendChild(popup);

        document.getElementById('accept-disclaimer-btn').addEventListener('click', () => {
            disclaimerContainer.innerHTML = ''; 
            disclaimerContainer.style.display = 'none';
            this.init(); 
        });
    }
    
    async init() {
        if (this.gameInitialized) return; 
        
        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (window.room && window.room.clientId) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });

        this.setRealMoney(this.realMoney, false); 
        this.setCoins(this.coins, false);       

        if (window.room) {
            window.room.updatePresence({
                realMoney: this.realMoney,
                coins: this.coins,
                luck: this.luck 
            });

            if (!window.room.roomState.gameSystemInitialized) {
                const peersArray = Object.keys(window.room.peers).sort();
                if (peersArray.length > 0 && window.room.clientId === peersArray[0]) {
                    window.room.updateRoomState({
                        gameSystemInitialized: true,
                        currentExchangeRate: 0.01, 
                        exchangeRateMeta: {
                            lastMonthProcessed: 0,
                            status: 'initial',
                            timestamp: Date.now(),
                            nextUpdateAttemptScheduled: false,
                        }
                    });
                    this.addToFeed("🏦 Central Bank initialized. Exchange rate system online.");
                }
            }

            window.room.subscribeRoomState(this.handleRoomStateUpdate.bind(this));
            this.handleRoomStateUpdate(window.room.roomState); 
        }

        this.updateDisplay();
        this.generateGloves();
        this.bindEvents();
        this.startFakeWinners();
        
        this.gameStartTime = Date.now();
        this.updateGameTimeDisplay(); 
        this.timeUpdateInterval = setInterval(this.updateGameTimeDisplay.bind(this), 1000); 

        this.gameInitialized = true;
        console.log("Game initialized after disclaimer.");
    }

    handleRoomStateUpdate(roomState) {
        if (!roomState) return;
        const exchangeRateDisplay = document.getElementById('exchange-rate-display');
        if (exchangeRateDisplay) {
            exchangeRateDisplay.textContent = roomState.currentExchangeRate ? roomState.currentExchangeRate.toFixed(4) : "N/A";
        }
        this.updateSellPreview(); 
    }
    
    setRealMoney(amount, updatePresence = true) {
        this.realMoney = Math.max(0, amount); 
        if (updatePresence && window.room) {
            window.room.updatePresence({ realMoney: this.realMoney });
        }
        document.getElementById('real-money').textContent = this.realMoney.toLocaleString();
    }

    setCoins(amount, updatePresence = true) {
        this.coins = Math.max(0, amount); 
        if (updatePresence && window.room) {
            window.room.updatePresence({ coins: this.coins });
        }
        document.getElementById('coins').textContent = this.coins.toLocaleString();
        this.updateSellPreview();
    }
    
    updateDisplay() {
        document.getElementById('real-money').textContent = this.realMoney.toLocaleString();
        document.getElementById('coins').textContent = this.coins.toLocaleString();
        document.getElementById('luck-value').textContent = this.luck;
        
        if (this.subscription) {
            document.getElementById('sub-status').textContent = `✅ PREMIUM ACTIVE`;
            document.getElementById('sub-status').className = 'premium-active';
            document.getElementById('subscribe-btn').style.display = 'none';
        } else {
            document.getElementById('sub-status').textContent = '❌ NO PREMIUM';
            document.getElementById('sub-status').className = 'no-sub';
            document.getElementById('subscribe-btn').style.display = 'block';
        }
        this.updateSellPreview();
    }
    
    updateGameTimeDisplay() {
        if (!this.gameStartTime || !this.gameInitialized) {
            const timeStatusIconEl = document.getElementById('time-status-icon');
            const timeTextEl = document.getElementById('time-text');
            if (timeStatusIconEl) timeStatusIconEl.textContent = '☀️';
            if (timeTextEl) timeTextEl.textContent = `Day 1`;
            if (document.getElementById('rate-update-timer-display')) document.getElementById('rate-update-timer-display').textContent = `Calculating...`;
            return;
        }

        const elapsedRealTimeMilliseconds = Date.now() - this.gameStartTime;
        const elapsedRealTimeSeconds = elapsedRealTimeMilliseconds / 1000;

        this.currentInGameDay = Math.floor(elapsedRealTimeSeconds / 2) + 1;
        const newInGameMonth = Math.floor((this.currentInGameDay -1) / 30) + 1;

        const secondsIntoCurrentMonth = (elapsedRealTimeSeconds % 60); 
        const secondsToNextMonth = 60 - secondsIntoCurrentMonth;
        
        const rateUpdateTimerDisplay = document.getElementById('rate-update-timer-display');
        if (rateUpdateTimerDisplay) {
            rateUpdateTimerDisplay.textContent = `${Math.floor(secondsToNextMonth)}s`;
        }

        if (newInGameMonth > this.currentInGameMonth) {
            this.currentInGameMonth = newInGameMonth;
            this.addToFeed(`🗓️ A new month has begun! Month ${this.currentInGameMonth}.`);
            this.attemptRateUpdateForNewMonth(this.currentInGameMonth);
        }
        
        const cyclePositionInSeconds = elapsedRealTimeSeconds % 2;
        this.isNight = cyclePositionInSeconds >= 1;

        const timeStatusIconEl = document.getElementById('time-status-icon');
        const timeTextEl = document.getElementById('time-text');

        if (timeStatusIconEl && timeTextEl) {
            if (this.isNight) {
                timeStatusIconEl.textContent = '🌙';
                timeTextEl.textContent = `Night ${this.currentInGameDay} (M ${this.currentInGameMonth})`;
            } else {
                timeStatusIconEl.textContent = '☀️';
                timeTextEl.textContent = `Day ${this.currentInGameDay} (M ${this.currentInGameMonth})`;
            }
        }
    }

    async attemptRateUpdateForNewMonth(newMonth) {
        if (!window.room || !window.room.peers || !window.room.clientId || !window.room.roomState.gameSystemInitialized) {
            console.log("Rate update: Room or system not ready.");
            return;
        }

        const exchangeRateMeta = window.room.roomState.exchangeRateMeta || { lastMonthProcessed: 0, status: 'initial' };

        if (exchangeRateMeta.lastMonthProcessed >= newMonth && exchangeRateMeta.status === 'completed') {
            return;
        }
        
        if (exchangeRateMeta.processingMonth === newMonth && exchangeRateMeta.status === 'processing') {
            return;
        }

        const connectedPeerIds = Object.keys(window.room.peers).sort();
        if (connectedPeerIds.length === 0 || window.room.clientId !== connectedPeerIds[0]) {
            return; 
        }
        
        console.log(`This client (${window.room.clientId}) is leader for month ${newMonth} rate update.`);
        this.addToFeed(`🏦 The Central Bank is convening to set new exchange rates for month ${newMonth}...`);

        window.room.updateRoomState({
            exchangeRateMeta: {
                ...exchangeRateMeta,
                processingMonth: newMonth,
                status: 'processing',
                leader: window.room.clientId,
                timestamp: Date.now()
            }
        });

        await this.calculateAndSetExchangeRate(newMonth, exchangeRateMeta.lastRateValue);
    }

    async calculateAndSetExchangeRate(month, previousRate) {
        if (!window.room) return;

        let totalRealMoney = 0;
        let totalLuckyCoins = 0;

        for (const playerId in window.room.presence) {
            const playerData = window.room.presence[playerId];
            totalRealMoney += (playerData.realMoney || 0);
            totalLuckyCoins += (playerData.coins || 0);
        }
        
        this.addToFeed(`Current Economy: ${totalRealMoney.toLocaleString()} Real Money, ${totalLuckyCoins.toLocaleString()} Lucky Coins.`);

        try {
            const systemPrompt = `You are an economic advisor for a virtual casino game. Players can earn 'Lucky Coins' through gameplay and can buy them with 'Real Money' (which is a finite resource they start with). Players now want to sell 'Lucky Coins' back for 'Real Money'.
Your task is to determine an exchange rate: how much 'Real Money' 1 'Lucky Coin' is worth.
'Real Money' supply is relatively fixed for players. 'Lucky Coins' are generated more frequently.
The exchange rate should:
1. Generally be unfavorable to the player (e.g., buying 1 Lucky Coin might cost more Real Money than selling 1 Lucky Coin yields).
2. Help maintain 'Real Money' as a valuable and somewhat scarce resource.
3. Not be extremely volatile but can adjust based on the total amounts in circulation.
A higher ratio of TLC to TRM might suggest Lucky Coins are less valuable.
The rate should be between 0.001 and 0.5.
Respond ONLY with a JSON object matching this schema: {\"exchangeRate\": <number>}. The number should be a positive decimal. Do not include any other text or explanation.`;

            const userPromptContent = `Current total Real Money (TRM) in circulation: ${totalRealMoney}. Current total Lucky Coins (TLC) in circulation: ${totalLuckyCoins}. Previous exchange rate (if available): ${previousRate || 'N/A'}. Determine the new exchange rate for 1 Lucky Coin to Real Money.`;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPromptContent }
                ],
                json: true,
            });

            const result = JSON.parse(completion.content);
            let exchangeRate = parseFloat(result.exchangeRate);

            if (isNaN(exchangeRate) || exchangeRate <= 0) {
                console.error("LLM returned invalid exchange rate, using fallback.", result);
                exchangeRate = previousRate || 0.01; 
                this.addToFeed(`⚠️ LLM provided an invalid rate. Using fallback rate: ${exchangeRate.toFixed(4)}.`);
            } else {
                exchangeRate = Math.max(0.0001, Math.min(0.5, exchangeRate));
            }

            window.room.updateRoomState({
                currentExchangeRate: exchangeRate,
                exchangeRateMeta: {
                    lastMonthProcessed: month,
                    status: 'completed',
                    processingMonth: null,
                    leader: null,
                    lastRateValue: exchangeRate,
                    timestamp: Date.now()
                }
            });
            this.addToFeed(`🏦 Exchange Rate Update (Month ${month}): 1 Lucky Coin = ${exchangeRate.toFixed(4)} Real Money.`);

        } catch (error) {
            console.error('Error calculating exchange rate with LLM:', error);
            this.addToFeed(`⚠️ Error updating exchange rate. Retaining previous rate if available.`);
            window.room.updateRoomState({
                exchangeRateMeta: {
                    ...(window.room.roomState.exchangeRateMeta || {}),
                    status: 'failed',
                    processingMonth: null, 
                    leader: null,
                    timestamp: Date.now()
                }
            });
        }
    }
    
    generateGloves() {
        const container = document.getElementById('gloves-grid');
        if (!container) {
            console.warn("Gloves container not found, skipping glove generation.");
            return;
        }
        container.innerHTML = '';
        
        this.gloves.forEach(glove => {
            const gloveEl = document.createElement('div');
            gloveEl.className = `glove-item ${this.ownedGloves.has(glove.id) ? 'owned' : ''}`;
            gloveEl.innerHTML = `
                <img class="glove-image" src="glove_${glove.id}.png" alt="${glove.name}">
                <div class="glove-name">${glove.name}</div>
                <div class="glove-luck">+${glove.luck}% Luck</div>
                <div class="glove-cost">${this.ownedGloves.has(glove.id) ? 'OWNED' : glove.cost + ' Coins'}</div>
            `;
            
            if (!this.ownedGloves.has(glove.id)) {
                gloveEl.addEventListener('click', () => this.buyGlove(glove));
            }
            
            container.appendChild(gloveEl);
        });
    }
    
    bindEvents() {
        const spinBtn = document.getElementById('spin-btn');
        const megaSpinBtn = document.getElementById('mega-spin-btn');
        const subscribeBtn = document.getElementById('subscribe-btn');
        const sellCoinsBtn = document.getElementById('sell-coins-btn'); 
        const sellCoinsAmountInput = document.getElementById('sell-coins-amount'); 


        if (spinBtn) spinBtn.addEventListener('click', () => this.spin(100, false));
        else console.warn("Spin button not found.");

        if (megaSpinBtn) megaSpinBtn.addEventListener('click', () => this.spin(500, true));
        else console.warn("Mega spin button not found.");
        
        if (subscribeBtn) subscribeBtn.addEventListener('click', () => this.showSubscriptionPopup());
        else console.warn("Subscribe button not found.");
        
        document.querySelectorAll('.package').forEach(pkg => {
            const buyBtn = pkg.querySelector('.buy-btn');
            buyBtn.addEventListener('click', () => {
                const cost = parseInt(pkg.dataset.cost);
                const coins = parseInt(pkg.dataset.coins);
                this.buyCoins(cost, coins);
            });
        });

        if (sellCoinsBtn) {
            sellCoinsBtn.addEventListener('click', () => this.sellLuckyCoins());
        } else {
            console.warn("Sell coins button not found.");
        }
        if (sellCoinsAmountInput) {
            sellCoinsAmountInput.addEventListener('input', () => this.updateSellPreview());
        } else {
            console.warn("Sell coins amount input not found.");
        }
    }

    updateSellPreview() {
        const sellAmountInput = document.getElementById('sell-coins-amount');
        const previewAmountDisplay = document.getElementById('sell-preview-amount');
        
        if (!sellAmountInput || !previewAmountDisplay || !window.room || !window.room.roomState) return;

        const coinsToSell = parseInt(sellAmountInput.value) || 0;
        const rate = window.room.roomState.currentExchangeRate || 0;
        
        if (coinsToSell <= 0) {
            previewAmountDisplay.textContent = "0.00";
            return;
        }
        
        const realMoneyGained = coinsToSell * rate;
        previewAmountDisplay.textContent = realMoneyGained.toFixed(2);
    }

    sellLuckyCoins() {
        if (!this.gameInitialized || !window.room || !window.room.roomState) return;

        const sellAmountInput = document.getElementById('sell-coins-amount');
        const coinsToSell = parseInt(sellAmountInput.value);

        if (isNaN(coinsToSell) || coinsToSell <= 0) {
            this.showPopup('⚠️ INVALID AMOUNT ⚠️', 'Please enter a valid amount of coins to sell.', [{ text: 'OK', action: () => {} }]);
            return;
        }

        if (coinsToSell > this.coins) {
            this.showPopup('🪙 NOT ENOUGH COINS! 🪙', `You don't have ${coinsToSell} Lucky Coins to sell.`, [{ text: 'OK', action: () => {} }]);
            return;
        }

        const rate = window.room.roomState.currentExchangeRate;
        if (!rate || rate <= 0) {
            this.showPopup('📈 RATE NOT AVAILABLE 📉', 'The exchange rate is not currently available. Please try again later.', [{ text: 'OK', action: () => {} }]);
            return;
        }

        const realMoneyGained = coinsToSell * rate;

        this.setCoins(this.coins - coinsToSell);
        this.setRealMoney(this.realMoney + realMoneyGained);
        
        this.showPopup('💰 COINS SOLD! 💰', `You sold ${coinsToSell.toLocaleString()} Lucky Coins for ${realMoneyGained.toFixed(2)} Real Money!`, [{ text: 'GREAT!', action: () => {} }]);
        this.addToFeed(`💸 ${window.room.peers[window.room.clientId]?.username || 'A player'} sold ${coinsToSell.toLocaleString()} coins for ${realMoneyGained.toFixed(2)} Real Money.`);
        
        sellAmountInput.value = ''; 
        this.updateDisplay(); 
    }
    
    spin(cost, isMega) {
        if (!this.gameInitialized) return; 
        if (this.realMoney < cost) {
            this.showPopup('💸 NOT ENOUGH MONEY! 💸', 'You need more money to spin! Buy coins or sell some to continue your winning streak!', [
                { text: 'BUY COINS NOW!', action: () => this.highlightCoinShop() }
            ]);
            return;
        }
        
        this.setRealMoney(this.realMoney - cost); 
        const slots = [document.getElementById('slot1'), document.getElementById('slot2'), document.getElementById('slot3')];
        slots.forEach(slot => slot.classList.add('spin'));
        
        setTimeout(() => {
            const results = this.generateResults(isMega);
            slots.forEach((slot, i) => {
                slot.textContent = results[i];
                slot.classList.remove('spin');
            });
            
            this.checkWin(results, isMega, cost); 
        }, 1000);
        
        if (window.room) {
            window.room.send({
                type: 'player_spin',
                username: window.room.peers[window.room.clientId]?.username || 'Anonymous',
                cost: cost,
                isMega: isMega
            });
        }
    }
    
    generateResults(isMega) {
        const results = [];
        const winChance = Math.min(this.luck * (isMega ? 2 : 1), 15); 
        const shouldWin = Math.random() * 100 < winChance;
        
        if (shouldWin) {
            const winSymbol = this.slots[Math.floor(Math.random() * this.slots.length)];
            results.push(winSymbol, winSymbol, winSymbol);
        } else {
            for (let i = 0; i < 3; i++) {
                results.push(this.slots[Math.floor(Math.random() * this.slots.length)]);
            }
            if (results[0] === results[1] && results[1] === results[2]) {
                results[2] = this.slots[(this.slots.indexOf(results[2]) + 1) % this.slots.length];
            }
        }
        
        return results;
    }

    checkWin(results, isMega, costOfSpin) { 
        if (!this.gameInitialized) return;

        if (results[0] === results[1] && results[1] === results[2]) {
            const multiplier = isMega ? 20 : 10;
            const payout = multiplier * this.luck;
            this.setCoins(this.coins + payout); 
            
            document.querySelector('.slot-machine').classList.add('win-animation');
            setTimeout(() => {
                document.querySelector('.slot-machine').classList.remove('win-animation');
            }, 2000);
            
            const message = this.winMessages[Math.floor(Math.random() * this.winMessages.length)];
            this.showPopup('🎊 WINNER! 🎊', `${message}\n\nYou won ${payout.toLocaleString()} coins!`, [
                { text: 'SPIN AGAIN!', action: () => {} }
            ]);
            
            if (window.room) {
                window.room.send({
                    type: 'player_win',
                    username: window.room.peers[window.room.clientId]?.username || 'Anonymous',
                    payout: payout,
                    symbol: results[0]
                });
            }
        } else {
            if (Math.random() < 0.3) {
                this.showPopup('😢 So Close! 😢', 'You were almost there! Your luck is building up. Try again!', [
                    { text: 'SPIN AGAIN!', action: () => {} }
                ]);
            }
        }
        
        this.updateDisplay(); 
    }
    
    buyGlove(glove) {
        if (!this.gameInitialized) return;

        if (this.coins < glove.cost) {
            this.showPopup('💸 NOT ENOUGH COINS! 💸', `You need ${glove.cost} coins to buy ${glove.name}!\n\nBuy more coins to increase your luck!`, [
                { text: 'BUY COINS!', action: () => this.highlightCoinShop() }
            ]);
            return;
        }
        
        this.setCoins(this.coins - glove.cost); 
        this.luck += glove.luck;
        this.ownedGloves.add(glove.id);
        
        if (window.room) { 
            window.room.updatePresence({ luck: this.luck });
        }

        this.showPopup('🧤 GLOVE PURCHASED! 🧤', `You bought ${glove.name}!\nYour luck increased by ${glove.luck}%!`, [
            { text: 'AWESOME!', action: () => {} }
        ]);
        
        this.generateGloves();
        this.updateDisplay();
    }
    
    buyCoins(cost, coins) {
        if (!this.gameInitialized) return;

        if (this.realMoney < cost) {
            this.showPopup('💸 INSUFFICIENT FUNDS! 💸', 'You don\'t have enough money! Your luck is about to change - don\'t give up now!', [
                { text: 'I\'LL FIND A WAY!', action: () => {} }
            ]);
            return;
        }
        
        this.setRealMoney(this.realMoney - cost); 
        this.setCoins(this.coins + coins);       
        
        this.showPopup('🪙 COINS PURCHASED! 🪙', `You bought ${coins.toLocaleString()} coins!\nNow go win big!`, [
            { text: 'LET\'S GAMBLE!', action: () => {} }
        ]);
        
        this.updateDisplay();
    }
    
    showSubscriptionPopup() {
        if (!this.gameInitialized) return;

        this.showPopup('🌟 PREMIUM MEMBERSHIP 🌟', 'Get 2x luck, exclusive gloves, and daily bonuses!\nOnly $50/month!', [
            { text: 'SUBSCRIBE NOW!', action: () => this.subscribe() },
            { text: 'Maybe Later', action: () => this.showUpsellPopup() }
        ]);
    }
    
    showUpsellPopup() {
        if (!this.gameInitialized) return;

        this.showPopup('⚠️ WAIT! ⚠️', 'Don\'t miss out! Premium members win 80% more often!\nFirst month only $25!', [
            { text: 'TAKE THE DEAL!', action: () => this.subscribe(25) },
            { text: 'No Thanks', action: () => this.showFinalUpsell() }
        ]);
    }
    
    showFinalUpsell() {
        if (!this.gameInitialized) return;

        this.showPopup('🚨 FINAL OFFER! 🚨', 'LAST CHANCE! One week FREE trial!\nCancel anytime!', [
            { text: 'FREE TRIAL!', action: () => this.subscribe(0, true) },
            { text: 'Close', action: () => {} }
        ]);
    }
    
    subscribe(cost = 50, isTrial = false) {
        if (!this.gameInitialized) return;

        if (this.realMoney < cost) {
            this.showPopup('💸 INSUFFICIENT FUNDS! 💸', 'You need more money to subscribe!', [
                { text: 'OK', action: () => {} }
            ]);
            return;
        }
        
        this.setRealMoney(this.realMoney - cost); 
        this.subscription = {
            type: isTrial ? 'trial' : 'premium',
            startDate: Date.now(),
            cost: isTrial ? 50 : cost 
        };
        this.luck *= 2;
        if (window.room) { 
            window.room.updatePresence({ luck: this.luck });
        }
        
        this.showPopup('🎉 SUBSCRIBED! 🎉', `Welcome to Premium! Your luck has doubled!\n${isTrial ? 'Free trial for 7 days!' : 'Monthly subscription active!'}`, [
            { text: 'START WINNING!', action: () => {} }
        ]);
        
        this.updateDisplay();
        
        setTimeout(() => {
            this.showUnsubscribeOffer();
        }, 30000);
    }

    showUnsubscribeOffer() {
        if (!this.gameInitialized || !this.subscription) return;
        
        this.showPopup('📊 SUBSCRIPTION MANAGER 📊', 'Manage your Premium subscription', [
            { text: 'Keep Premium', action: () => {} },
            { text: 'Cancel Subscription', action: () => this.startCancellationProcess() }
        ]);
    }
    
    startCancellationProcess() {
        if (!this.gameInitialized) return;
        this.cancelAttempts++;
        
        const originalHandleCoins = (coins) => {
            this.setCoins(this.coins + coins); 
            this.updateDisplay();
        };

        const cancellationMessages = [
            {
                title: '😢 ARE YOU SURE? 😢',
                message: 'You\'ll lose your 2x luck bonus!\nYour winning streak will end!',
                buttons: [
                    { text: 'Keep Premium', action: () => {} },
                    { text: 'Still Cancel', action: () => this.startCancellationProcess() }
                ]
            },
            {
                title: '💰 SPECIAL OFFER! 💰',
                message: 'Wait! Stay subscribed and get 100 FREE coins!\nDon\'t throw away your luck!',
                buttons: [
                    { text: 'Take Free Coins!', action: () => { originalHandleCoins(100); } }, 
                    { text: 'Still Cancel', action: () => this.startCancellationProcess() }
                ]
            },
            {
                title: '🚨 FINAL WARNING! 🚨',
                message: 'Canceling now will reset your luck to 1%!\nYou\'ll never win again!',
                buttons: [
                    { text: 'Keep My Luck!', action: () => {} },
                    { text: 'Cancel Anyway', action: () => this.startCancellationProcess() }
                ]
            },
            {
                title: '😭 PLEASE DON\'T GO! 😭',
                message: 'We\'ll give you 50% off forever!\nJust $25/month!',
                buttons: [
                    { text: 'Take the Deal!', action: () => { this.subscription.cost = 25; } },
                    { text: 'Cancel', action: () => this.startCancellationProcess() }
                ]
            },
            {
                title: '🎲 ONE LAST CHANCE! 🎲',
                message: 'Free spin on the MEGA JACKPOT!\nIf you lose, we\'ll cancel for free!',
                buttons: [
                    { text: 'Free Mega Spin!', action: () => this.spin(0, true) },
                    { text: 'Just Cancel', action: () => this.cancelSubscription() }
                ]
            }
        ];
        
        if (this.cancelAttempts <= cancellationMessages.length) {
            const messageConfig = cancellationMessages[this.cancelAttempts - 1]; 
            this.showPopup(messageConfig.title, messageConfig.message, messageConfig.buttons);
        } else {
            this.cancelSubscription();
        }
    }

    cancelSubscription() {
        if (!this.gameInitialized) return;

        this.subscription = null;
        this.luck = Math.max(1, Math.round(this.luck / 2)); 
        if (window.room) { 
            window.room.updatePresence({ luck: this.luck });
        }
        this.cancelAttempts = 0;
        
        document.getElementById('sub-status').textContent = '❌ NO PREMIUM';
        document.getElementById('sub-status').className = 'no-sub';
        document.getElementById('subscribe-btn').style.display = 'block';
        
        this.showPopup('💔 SUBSCRIPTION CANCELED 💔', 'Your luck has been reset!\nYou\'ll miss out on all the wins!', [
            { text: 'I Made a Mistake!', action: () => this.showSubscriptionPopup() },
            { text: 'Continue Playing', action: () => {} }
        ]);
        
        this.updateDisplay();
    }

    highlightCoinShop() {
        if (!this.gameInitialized) return;

        const coinShop = document.querySelector('.coin-shop');
        if (!coinShop) return;
        coinShop.style.border = '5px solid #ff0000';
        coinShop.style.animation = 'pulse 1s infinite';
        
        setTimeout(() => {
            coinShop.style.border = '3px solid #f39c12';
            coinShop.style.animation = '';
        }, 3000);
    }
    
    showPopup(title, message, buttons) {
        if (!this.gameInitialized && title !== '🚨 Important Disclaimer 🚨') { 
            console.warn("Game not initialized, popup suppressed:", title);
            return;
        }

        const popupContainer = document.getElementById('popup-container');
        if (!popupContainer) {
            console.error("Popup container not found!");
            return;
        }
        popupContainer.innerHTML = ''; 

        const popup = document.createElement('div');
        popup.className = 'popup';
        
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        
        popup.innerHTML = `
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="popup-buttons">
                ${buttons.map((btn, i) => `
                    <button class="popup-btn ${i === 0 ? 'confirm' : 'cancel'}" data-action="${i}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;
        
        buttons.forEach((btn, i) => {
            popup.querySelector(`[data-action="${i}"]`).addEventListener('click', () => {
                document.getElementById('popup-container').innerHTML = '';
                btn.action();
            });
        });
        
        popupContainer.appendChild(overlay);
        popupContainer.appendChild(popup);
    }
    
    startFakeWinners() {
        if (!this.gameInitialized) {
            const checkInit = setInterval(() => {
                if (this.gameInitialized) {
                    clearInterval(checkInit);
                    this._startFakeWinnersLogic();
                }
            }, 100);
            return;
        }
        this._startFakeWinnersLogic();
    }

    _startFakeWinnersLogic() {
        const fakeNames = ['LuckyMike', 'BigWinner99', 'CoinMaster', 'JackpotJill', 'GoldenGamer', 'SpinKing'];
        
        setInterval(() => {
            if (!this.gameInitialized) return; 
            const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
            const amount = Math.floor(Math.random() * 1000) + 100;
            const symbol = this.slots[Math.floor(Math.random() * this.slots.length)];
            
            this.addToFeed(`🎉 ${name} just won ${amount} coins with ${symbol}${symbol}${symbol}!`);
        }, 3000 + Math.random() * 5000);
    }
    
    addToFeed(message) {
        if (!this.gameInitialized) return;

        const feed = document.getElementById('results-feed');
        if (!feed) {
            console.warn("Results feed not found, skipping message:", message);
            return;
        }
        const timestamp = new Date().toLocaleTimeString();
        feed.innerHTML = `[${timestamp}] ${message}<br>` + feed.innerHTML;
        
        const lines = feed.innerHTML.split('<br>');
        if (lines.length > 20) {
            feed.innerHTML = lines.slice(0, 20).join('<br>');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new MegaLuckCasino();
});