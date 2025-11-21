// Mini slot game logic (v2)
const SYMBOLS = ['🍒','🍋','🍊','🔔','⭐','7️⃣'];
const STORAGE_KEY = 'midnight_balance_v1';
const START_BALANCE = 1000;

const $ = id => document.getElementById(id);

let balance = loadBalance();
let spinning = false;

const reels = [ $('reel0'), $('reel1'), $('reel2') ];
const balanceEl = $('balance');
const betInput = $('bet');
const spinBtn = $('spinBtn');
const maxBtn = $('maxBet');
const resetBtn = $('resetBtn');
const messageEl = $('message');

// lightweight WebAudio tone for feedback
let audioCtx = null;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playTone(freq=880, duration=0.08, gain=0.06){
	try{
		ensureAudio();
		const o = audioCtx.createOscillator();
		const g = audioCtx.createGain();
		o.type = 'sine';
		o.frequency.value = freq;
		g.gain.value = gain;
		o.connect(g); g.connect(audioCtx.destination);
		o.start();
		o.stop(audioCtx.currentTime + duration);
	}catch(e){ /* audio may be blocked */ }
}

function loadBalance(){
	const raw = localStorage.getItem(STORAGE_KEY);
	if(raw !== null){
		const parsed = Number(raw);
		if(!Number.isNaN(parsed)) return parsed;
	}
	localStorage.setItem(STORAGE_KEY, START_BALANCE);
	return START_BALANCE;
}

function saveBalance(){
	localStorage.setItem(STORAGE_KEY, String(balance));
}

function updateUI(){
	balanceEl.textContent = balance.toFixed(0);
	betInput.max = String(Math.max(1, balance));
}

function showMessage(txt, kind){
	messageEl.textContent = txt;
	messageEl.classList.toggle('win', kind === 'win');
}

function randomSymbol(){
	return SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
}

function setSymbol(reelEl, sym){
	// update visible text and the data-symbol used by the pseudo-element for trail blur
	reelEl.dataset.symbol = sym;
	reelEl.textContent = sym;
}

function evaluateResult(final){
	const counts = {};
	final.forEach(s => counts[s] = (counts[s]||0)+1);
	const occurrences = Object.values(counts).sort((a,b)=>b-a);
	if(occurrences[0] === 3){
		const sym = final[0];
		const multiplier = (sym === '7️⃣') ? 15 : 5;
		return {type:'big-win', multiplier };
	}
	if(occurrences[0] === 2){
		return {type:'small-win', multiplier:2};
	}
	return {type:'lose', multiplier:0};
}

function setReelsSpinning(on = true){
	reels.forEach(r => r.classList.toggle('spinning', on));
}

function flashBalance(){
	balanceEl.classList.add('win');
	setTimeout(()=> balanceEl.classList.remove('win'), 900);
}

function spin(){
	if(spinning) return;
	let bet = Math.floor(Number(betInput.value) || 0);
	if(bet <= 0){ showMessage('Enter a bet greater than $0'); return; }
	if(bet > balance){ showMessage('Not enough balance for that bet'); return; }

	spinning = true;
	spinBtn.disabled = true;
	maxBtn.disabled = true;
	resetBtn.disabled = true;
	betInput.disabled = true;

	// take bet
	balance -= bet;
	updateUI();

	showMessage('Spinning...');
	playTone(880, 0.06, 0.05);
	setReelsSpinning(true);

	// For a smoother feel, each reel cycles faster then decelerates.
	const final = [null,null,null];
	const cycleHandles = [];

	// helper: create a decelerating loop using recursive timeouts
	function startCycle(reelIndex, steps, initialInterval, finalDelay){
		let i = 0;
		let interval = initialInterval;
		function step(){
			if(i >= steps){
				final[reelIndex] = randomSymbol();
				setSymbol(reels[reelIndex], final[reelIndex]);
				reels[reelIndex].classList.add('pop');
				setTimeout(()=> reels[reelIndex].classList.remove('pop'), 260);
				playTone(880 - reelIndex*120, 0.04, 0.04);
				return Promise.resolve();
			}
			setSymbol(reels[reelIndex], randomSymbol());
			i++;
			// slowly increase interval (decelerate)
			interval = Math.min(finalDelay, interval * 1.18);
			return new Promise(res => setTimeout(()=> res(step()), interval));
		}
		return step();
	}

	// Kick off cycles with different lengths to stagger stops
	Promise.all([
		startCycle(0, 12, 40, 220),
		startCycle(1, 18, 40, 300),
		startCycle(2, 24, 40, 360)
	]).then(() => {
		setReelsSpinning(false);
		const result = evaluateResult(final);
		let payout = 0;
		if(result.type === 'big-win' || result.type === 'small-win'){
			payout = bet * result.multiplier;
			balance += payout;
			saveBalance();
			playTone(1200, 0.12, 0.12);
			if(result.type === 'big-win'){
				// celebratory sequence
				playTone(1000, 0.06, 0.12);
				setTimeout(()=> playTone(1400, 0.08, 0.12), 120);
			}
			showMessage(`${result.type==='big-win'?'Big Win!':'Win!'} You won $${payout}`, 'win');
			flashBalance();
		} else {
			saveBalance();
			showMessage('No win — better luck next spin');
		}

		spinning = false;
		spinBtn.disabled = false;
		maxBtn.disabled = false;
		resetBtn.disabled = false;
		betInput.disabled = false;
		updateUI();
	});
}

// wire-up
spinBtn.addEventListener('click', spin);
maxBtn.addEventListener('click', ()=>{ betInput.value = Math.max(1, balance); });
resetBtn.addEventListener('click', ()=>{
	if(confirm('Reset balance to starting amount?')){
		balance = START_BALANCE;
		saveBalance();
		updateUI();
		showMessage('Balance reset');
	}
});

// Enter to spin when focus in bet input
betInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ spin(); } });

// init
function init(){
	reels.forEach(r => setSymbol(r, randomSymbol()));
	updateUI();
}
init();


