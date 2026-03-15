const CARD_LETTERS = [
  'A','B','C','D','E','F','G','H','I','J',
  'K','L','M','N','O','P','Q','R','S'
];

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const winScreen = document.getElementById('win-screen');
const gameBoard = document.getElementById('game-board');
const pairsFoundText = document.getElementById('pairs-found');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');

let deck = [];
let flippedCards = [];
let lockBoard = false;
let matchedPairs = 0;

let resolvedBackImage = '';
const resolvedFrontImages = {};
let assetsReadyPromise = null;

// ── All back-card filename variants to try ──────────────────────────────────
const BACK_CANDIDATES = [
  'cards/card back.png',
  'cards/card-back.png',
  'cards/card_back.png',
  'cards/cardback.png',
  'cards/Card Back.png',
  'cards/Card-Back.png',
  'cards/CardBack.png',
  'cards/back.png',
  'cards/Back.png',
];

// ── Test whether an image URL actually loads ────────────────────────────────
function testImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function findExistingImagePath(candidates) {
  for (const candidate of candidates) {
    if (await testImage(candidate)) return candidate;
  }
  return null;
}

// ── Show an error banner inside the start panel ─────────────────────────────
function showError(msg) {
  let banner = document.getElementById('error-banner');
  if (!banner) {
    banner = document.createElement('p');
    banner.id = 'error-banner';
    banner.style.cssText = [
      'color:#c0392b',
      'background:#fdecea',
      'border:1px solid #f5c6cb',
      'border-radius:8px',
      'padding:10px 14px',
      'margin-top:16px',
      'font-size:0.9rem',
      'text-align:right',
      'direction:rtl',
      'white-space:pre-wrap',
      'word-break:break-all',
    ].join(';');
    const panel = document.querySelector('.start-panel') || document.body;
    panel.appendChild(banner);
  }
  banner.textContent = msg;
}

// ── Resolve all image paths once ────────────────────────────────────────────
async function resolveAssets() {
  // Back-of-card
  const foundBack = await findExistingImagePath(BACK_CANDIDATES);
  if (!foundBack) {
    throw new Error(
      'לא נמצאה תמונת גב הכרטיס.\n' +
      'ודאי שהקובץ נמצא בתיקיית cards/ ב-GitHub.\n' +
      'שמות שנבדקו:\n' + BACK_CANDIDATES.join('\n')
    );
  }
  resolvedBackImage = foundBack;

  // Front images  A1.png ... S2.png  (also tries lowercase)
  for (const letter of CARD_LETTERS) {
    for (const side of ['1', '2']) {
      const candidates = [
        `cards/${letter}${side}.png`,
        `cards/${letter.toLowerCase()}${side}.png`,
      ];
      const found = await findExistingImagePath(candidates);
      if (!found) {
        throw new Error(
          `לא נמצאה תמונה: ${letter}${side}.png\n` +
          'ודאי שהקובץ קיים בתיקיית cards/ ב-GitHub\n' +
          'ושמו בדיוק ' + `${letter}${side}.png` + ' (אותיות גדולות/קטנות חשובות!)'
        );
      }
      resolvedFrontImages[`${letter}${side}`] = found;
    }
  }
}

function ensureAssetsReady() {
  if (!assetsReadyPromise) {
    assetsReadyPromise = resolveAssets();
  }
  return assetsReadyPromise;
}

// ── Game logic ───────────────────────────────────────────────────────────────
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const cards = [];
  for (const letter of CARD_LETTERS) {
    cards.push({ id: `${letter}1`, pairId: letter, frontImage: resolvedFrontImages[`${letter}1`], alt: `כרטיס ${letter}1` });
    cards.push({ id: `${letter}2`, pairId: letter, frontImage: resolvedFrontImages[`${letter}2`], alt: `כרטיס ${letter}2` });
  }
  return shuffle(cards);
}

function showScreen(screen) {
  [startScreen, gameScreen, winScreen].forEach(s =>
    s.classList.toggle('active', s === screen)
  );
}

function resetState() {
  deck = buildDeck();
  flippedCards = [];
  lockBoard = false;
  matchedPairs = 0;
  pairsFoundText.textContent = '0';
}

function createCardElement(cardData) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.dataset.id = cardData.id;
  card.dataset.pairId = cardData.pairId;
  card.setAttribute('aria-label', `קלף זיכרון ${cardData.id}`);
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">
        <img src="${resolvedBackImage}" alt="גב הכרטיס" draggable="false" />
      </div>
      <div class="card-face card-front">
        <img src="${cardData.frontImage}" alt="${cardData.alt}" draggable="false" />
      </div>
    </div>`;
  card.addEventListener('click', () => onCardClick(card));
  return card;
}

function renderBoard() {
  gameBoard.innerHTML = '';
  const fragment = document.createDocumentFragment();
  deck.forEach(cardData => fragment.appendChild(createCardElement(cardData)));
  gameBoard.appendChild(fragment);
}

function flipCard(card)   { card.classList.add('flipped'); }
function unflipCard(card) { card.classList.remove('flipped'); }

function handleMatch(firstCard, secondCard) {
  firstCard.classList.add('matched');
  secondCard.classList.add('matched');
  firstCard.disabled = true;
  secondCard.disabled = true;
  matchedPairs++;
  pairsFoundText.textContent = String(matchedPairs);
  setTimeout(() => {
    firstCard.style.visibility = 'hidden';
    secondCard.style.visibility = 'hidden';
    flippedCards = [];
    lockBoard = false;
    if (matchedPairs === CARD_LETTERS.length) setTimeout(() => showScreen(winScreen), 250);
  }, 500);
}

function handleMismatch(firstCard, secondCard) {
  setTimeout(() => {
    unflipCard(firstCard);
    unflipCard(secondCard);
    flippedCards = [];
    lockBoard = false;
  }, 950);
}

function onCardClick(card) {
  if (lockBoard) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  flipCard(card);
  flippedCards.push(card);
  if (flippedCards.length < 2) return;
  lockBoard = true;
  const [first, second] = flippedCards;
  first.dataset.pairId === second.dataset.pairId
    ? handleMatch(first, second)
    : handleMismatch(first, second);
}

async function startGame() {
  startBtn.disabled = true;
  restartBtn.disabled = true;
  playAgainBtn.disabled = true;

  try {
    await ensureAssetsReady();
    resetState();
    renderBoard();
    showScreen(gameScreen);
  } catch (error) {
    console.error(error);
    assetsReadyPromise = null;
    showError(error.message);
  } finally {
    startBtn.disabled = false;
    restartBtn.disabled = false;
    playAgainBtn.disabled = false;
  }
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);

showScreen(startScreen);
ensureAssetsReady().catch(() => { assetsReadyPromise = null; });
