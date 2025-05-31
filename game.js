class MegaLuckCasino {
    constructor() {
        this.realMoney = 10000;
        this.coins = 0;
        this.luck = 1;
        this.subscription = null;
        this.ownedGloves = new Set();
        this.cancelAttempts = 0;
        
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
        
        this.init();
    }
    
    init() {
        this.updateDisplay();
        this.generateGloves();
        this.bindEvents();
        this.startFakeWinners();
    }
    
    updateDisplay() {
        document.getElementById('real-money').textContent = this.realMoney.toLocaleString();
        document.getElementById('coins').textContent = this.coins.toLocaleString();
        document.getElementById('luck-value').textContent = this.luck;
        
        if (this.subscription) {
            document.getElementById('sub-status').textContent = `✅ PREMIUM ACTIVE`;
            document.getElementById('sub-status').className = 'premium-active';
            document.getElementById('subscribe-btn').style.display = 'none';
        }
    }
    
    generateGloves() {
        const container = document.getElementById('gloves-grid');
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
        document.getElementById('spin-btn').addEventListener('click', () => this.spin(100, false));
        document.getElementById('mega-spin-btn').addEventListener('click', () => this.spin(500, true));
        document.getElementById('subscribe-btn').addEventListener('click', () => this.showSubscriptionPopup());
        
        // Coin packages
        document.querySelectorAll('.package').forEach(pkg => {
            const buyBtn = pkg.querySelector('.buy-btn');
            buyBtn.addEventListener('click', () => {
                const cost = parseInt(pkg.dataset.cost);
                const coins = parseInt(pkg.dataset.coins);
                this.buyCoins(cost, coins);
            });
        });
    }
    
    spin(cost, isMega) {
        if (this.realMoney < cost) {
            this.showPopup('💸 NOT ENOUGH MONEY! 💸', 'You need more money to spin! Buy coins to continue your winning streak!', [
                { text: 'BUY COINS NOW!', action: () => this.highlightCoinShop() }
            ]);
            return;
        }
        
        this.realMoney -= cost;
        this.updateDisplay();
        
        // Animate slots
        const slots = [document.getElementById('slot1'), document.getElementById('slot2'), document.getElementById('slot3')];
        slots.forEach(slot => slot.classList.add('spin'));
        
        setTimeout(() => {
            const results = this.generateResults(isMega);
            slots.forEach((slot, i) => {
                slot.textContent = results[i];
                slot.classList.remove('spin');
            });
            
            this.checkWin(results, isMega);
        }, 1000);
        
        // Broadcast spin to other players
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
        const winChance = Math.min(this.luck * (isMega ? 2 : 1), 15); // Max 15% win chance
        const shouldWin = Math.random() * 100 < winChance;
        
        if (shouldWin) {
            // Generate winning combination
            const winSymbol = this.slots[Math.floor(Math.random() * this.slots.length)];
            results.push(winSymbol, winSymbol, winSymbol);
        } else {
            // Generate losing combination
            for (let i = 0; i < 3; i++) {
                results.push(this.slots[Math.floor(Math.random() * this.slots.length)]);
            }
            // Ensure it's not a win
            if (results[0] === results[1] && results[1] === results[2]) {
                results[2] = this.slots[(this.slots.indexOf(results[2]) + 1) % this.slots.length];
            }
        }
        
        return results;
    }
    
    checkWin(results, isMega) {
        if (results[0] === results[1] && results[1] === results[2]) {
            // Win!
            const multiplier = isMega ? 20 : 10;
            const payout = multiplier * this.luck;
            this.coins += payout;
            
            // Win animation
            document.querySelector('.slot-machine').classList.add('win-animation');
            setTimeout(() => {
                document.querySelector('.slot-machine').classList.remove('win-animation');
            }, 2000);
            
            const message = this.winMessages[Math.floor(Math.random() * this.winMessages.length)];
            this.showPopup('🎊 WINNER! 🎊', `${message}\n\nYou won ${payout} coins!`, [
                { text: 'SPIN AGAIN!', action: () => {} }
            ]);
            
            // Broadcast win
            if (window.room) {
                window.room.send({
                    type: 'player_win',
                    username: window.room.peers[window.room.clientId]?.username || 'Anonymous',
                    payout: payout,
                    symbol: results[0]
                });
            }
        } else {
            // Loss - show encouraging popup sometimes
            if (Math.random() < 0.3) {
                this.showPopup('😢 So Close! 😢', 'You were almost there! Your luck is building up. Try again!', [
                    { text: 'SPIN AGAIN!', action: () => {} }
                ]);
            }
        }
        
        this.updateDisplay();
    }
    
    buyGlove(glove) {
        if (this.coins < glove.cost) {
            this.showPopup('💸 NOT ENOUGH COINS! 💸', `You need ${glove.cost} coins to buy ${glove.name}!\n\nBuy more coins to increase your luck!`, [
                { text: 'BUY COINS!', action: () => this.highlightCoinShop() }
            ]);
            return;
        }
        
        this.coins -= glove.cost;
        this.luck += glove.luck;
        this.ownedGloves.add(glove.id);
        
        this.showPopup('🧤 GLOVE PURCHASED! 🧤', `You bought ${glove.name}!\nYour luck increased by ${glove.luck}%!`, [
            { text: 'AWESOME!', action: () => {} }
        ]);
        
        this.generateGloves();
        this.updateDisplay();
    }
    
    buyCoins(cost, coins) {
        if (this.realMoney < cost) {
            this.showPopup('💸 INSUFFICIENT FUNDS! 💸', 'You don\'t have enough money! Your luck is about to change - don\'t give up now!', [
                { text: 'I\'LL FIND A WAY!', action: () => {} }
            ]);
            return;
        }
        
        this.realMoney -= cost;
        this.coins += coins;
        
        this.showPopup('🪙 COINS PURCHASED! 🪙', `You bought ${coins} coins!\nNow go win big!`, [
            { text: 'LET\'S GAMBLE!', action: () => {} }
        ]);
        
        this.updateDisplay();
    }
    
    showSubscriptionPopup() {
        this.showPopup('🌟 PREMIUM MEMBERSHIP 🌟', 'Get 2x luck, exclusive gloves, and daily bonuses!\nOnly $50/month!', [
            { text: 'SUBSCRIBE NOW!', action: () => this.subscribe() },
            { text: 'Maybe Later', action: () => this.showUpsellPopup() }
        ]);
    }
    
    showUpsellPopup() {
        this.showPopup('⚠️ WAIT! ⚠️', 'Don\'t miss out! Premium members win 80% more often!\nFirst month only $25!', [
            { text: 'TAKE THE DEAL!', action: () => this.subscribe(25) },
            { text: 'No Thanks', action: () => this.showFinalUpsell() }
        ]);
    }
    
    showFinalUpsell() {
        this.showPopup('🚨 FINAL OFFER! 🚨', 'LAST CHANCE! One week FREE trial!\nCancel anytime!', [
            { text: 'FREE TRIAL!', action: () => this.subscribe(0, true) },
            { text: 'Close', action: () => {} }
        ]);
    }
    
    subscribe(cost = 50, isTrial = false) {
        if (this.realMoney < cost) {
            this.showPopup('💸 INSUFFICIENT FUNDS! 💸', 'You need more money to subscribe!', [
                { text: 'OK', action: () => {} }
            ]);
            return;
        }
        
        this.realMoney -= cost;
        this.subscription = {
            type: isTrial ? 'trial' : 'premium',
            startDate: Date.now(),
            cost: isTrial ? 50 : cost // Trial will charge $50 after a week
        };
        this.luck *= 2;
        
        this.showPopup('🎉 SUBSCRIBED! 🎉', `Welcome to Premium! Your luck has doubled!\n${isTrial ? 'Free trial for 7 days!' : 'Monthly subscription active!'}`, [
            { text: 'START WINNING!', action: () => {} }
        ]);
        
        this.updateDisplay();
        
        // Show unsubscribe button after 30 seconds
        setTimeout(() => {
            this.showUnsubscribeOffer();
        }, 30000);
    }
    
    showUnsubscribeOffer() {
        if (!this.subscription) return;
        
        this.showPopup('📊 SUBSCRIPTION MANAGER 📊', 'Manage your Premium subscription', [
            { text: 'Keep Premium', action: () => {} },
            { text: 'Cancel Subscription', action: () => this.startCancellationProcess() }
        ]);
    }
    
    startCancellationProcess() {
        this.cancelAttempts++;
        
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
                    { text: 'Take Free Coins!', action: () => { this.coins += 100; this.updateDisplay(); } },
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
            const message = cancellationMessages[this.cancelAttempts - 1];
            this.showPopup(message.title, message.message, message.buttons);
        } else {
            this.cancelSubscription();
        }
    }
    
    cancelSubscription() {
        this.subscription = null;
        this.luck = Math.max(1, this.luck / 2);
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
        const coinShop = document.querySelector('.coin-shop');
        coinShop.style.border = '5px solid #ff0000';
        coinShop.style.animation = 'pulse 1s infinite';
        
        setTimeout(() => {
            coinShop.style.border = '3px solid #f39c12';
            coinShop.style.animation = '';
        }, 3000);
    }
    
    showPopup(title, message, buttons) {
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
        
        const container = document.getElementById('popup-container');
        container.appendChild(overlay);
        container.appendChild(popup);
    }
    
    startFakeWinners() {
        const fakeNames = ['LuckyMike', 'BigWinner99', 'CoinMaster', 'JackpotJill', 'GoldenGamer', 'SpinKing'];
        
        setInterval(() => {
            const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
            const amount = Math.floor(Math.random() * 1000) + 100;
            const symbol = this.slots[Math.floor(Math.random() * this.slots.length)];
            
            this.addToFeed(`🎉 ${name} just won ${amount} coins with ${symbol}${symbol}${symbol}!`);
        }, 3000 + Math.random() * 5000);
    }
    
    addToFeed(message) {
        const feed = document.getElementById('results-feed');
        const timestamp = new Date().toLocaleTimeString();
        feed.innerHTML = `[${timestamp}] ${message}<br>` + feed.innerHTML;
        
        // Keep only last 20 messages
        const lines = feed.innerHTML.split('<br>');
        if (lines.length > 20) {
            feed.innerHTML = lines.slice(0, 20).join('<br>');
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MegaLuckCasino();
});

