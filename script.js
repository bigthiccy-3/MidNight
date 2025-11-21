// Mini slot game logic
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

function showMessage(txt){
	messageEl.textContent = txt;
}

function randomSymbol(){
	return SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
}

function evaluateResult(final){
	// final: array of 3 symbols
	const counts = {};
	final.forEach(s => counts[s] = (counts[s]||0)+1);
	const occurrences = Object.values(counts).sort((a,b)=>b-a);
	// three of a kind
	if(occurrences[0] === 3){
		const sym = final[0];
		const multiplier = (sym === '7️⃣') ? 15 : 5; // 7 is special
		return {type:'big-win', multiplier };
	}
	// two of a kind
	if(occurrences[0] === 2){
		return {type:'small-win', multiplier:2};
	}
	return {type:'lose', multiplier:0};
}

function animateReelsDuringSpin(intervalHandles){
	// add spinning class for slight visual
	reels.forEach(r => r.classList.add('spinning'));
	// clear after spin is done by caller
}

function stopReelVisuals(){
	reels.forEach(r => r.classList.remove('spinning'));
}

function spin(){
	if(spinning) return;
	let bet = Number(betInput.value) || 0;
	bet = Math.floor(bet);
	if(bet <= 0){ showMessage('Enter a bet greater than $0'); return; }
	if(bet > balance){ showMessage('Not enough balance for that bet'); return; }

	// start
	spinning = true;
	spinBtn.disabled = true;
	maxBtn.disabled = true;
	resetBtn.disabled = true;
	betInput.disabled = true;

	// take the bet up front
	balance -= bet;
	updateUI();

	showMessage('Spinning...');

	// set intervals to quickly cycle symbols for each reel
	const handles = [];
	const frameMs = 60;
	reels.forEach((r, idx) => {
		handles[idx] = setInterval(() => {
			r.textContent = randomSymbol();
		}, frameMs);
	});
	animateReelsDuringSpin(handles);

	// decide durations so reels stop staggered
	const durations = [900, 1400, 1850];
	const final = [null,null,null];
	durations.forEach((dur, i) => {
		setTimeout(() => {
			clearInterval(handles[i]);
			final[i] = randomSymbol();
			reels[i].textContent = final[i];
			// small pop effect
			reels[i].classList.add('pop');
			setTimeout(()=> reels[i].classList.remove('pop'), 260);

			// when last reel stops, evaluate
			if(i === durations.length-1){
				const result = evaluateResult(final);
				let payout = 0;
				if(result.type === 'big-win' || result.type === 'small-win'){
					payout = bet * result.multiplier;
					balance += payout;
					saveBalance();
					showMessage((result.type==='big-win' ? 'Big Win! ' : 'Win! ') + `You won $${payout}`);
				} else {
					saveBalance();
					showMessage('No win — better luck next spin');
				}

				// finish
				spinning = false;
				stopReelVisuals();
				spinBtn.disabled = false;
				maxBtn.disabled = false;
				resetBtn.disabled = false;
				betInput.disabled = false;
				updateUI();
			}
		}, dur);
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

// initialize reels with random symbols
function init(){
	reels.forEach(r => r.textContent = randomSymbol());
	updateUI();
}

init();

