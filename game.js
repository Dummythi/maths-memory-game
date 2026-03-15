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
let pendingFlipBack = [];   // cards waiting to be flipped back on next click
let lockBoard = false;
let matchedPairs = 0;

let resolvedBackImage = '';
const resolvedFrontImages = {};
let assetsReadyPromise = null;

const BACK_CANDIDATES = [
  'cards/card-back.webp',
  'cards/card-back.png',
  'cards/card back.webp',
  'cards/card back.png',
  'cards/card_back.webp',
  'cards/card_back.png',
  'cards/cardback.webp',
  'cards/cardback.png',
  'cards/back.webp',
  'cards/back.png',
];

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

function preloadAllImages() {
  const urls = [resolvedBackImage, ...Object.values(resolvedFrontImages)];
  urls.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

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

async function resolveAssets() {
  const foundBack = await findExistingImagePath(BACK_CANDIDATES);
  if (!foundBack) {
    throw new Error(
      'לא נמצאה תמונת גב הכרטיס.\n' +
      'שמות שנבדקו:\n' + BACK_CANDIDATES.join('\n')
    );
  }
  resolvedBackImage = foundBack;

  for (const letter of CARD_LETTERS) {
    for (const side of ['1', '2']) {
      const candidates = [
        `cards/${letter}${side}.webp`,
        `cards/${letter}${side}.png`,
        `cards/${letter.toLowerCase()}${side}.webp`,
        `cards/${letter.toLowerCase()}${side}.png`,
      ];
      const found = await findExistingImagePath(candidates);
      if (!found) {
        throw new Error(
          `לא נמצאה תמונה: ${letter}${side}.png\n` +
          'ודאי שהקובץ קיים בתיקיית cards/ ושמו בדיוק ' +
          `${letter}${side}.png (אותיות גדולות/קטנות חשובות!)`
        );
      }
      resolvedFrontImages[`${letter}${side}`] = found;
    }
  }

  preloadAllImages();
}

function ensureAssetsReady() {
  if (!assetsReadyPromise) {
    assetsReadyPromise = resolveAssets();
  }
  return assetsReadyPromise;
}

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
  pendingFlipBack = [];
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
  // Leave both cards face-up; they'll flip back when the next card is clicked
  lockBoard = false;
  flippedCards = [];
  pendingFlipBack = [firstCard, secondCard];
}

function onCardClick(card) {
  if (lockBoard) return;
  if (card.classList.contains('matched')) return;

  // If two unmatched cards are still showing, flip them back first
  if (pendingFlipBack.length) {
    pendingFlipBack.forEach(unflipCard);
    pendingFlipBack = [];
    // If the player clicked one of the two showing cards, just close them and stop
    if (pendingFlipBack.includes(card)) return;
  }

  if (card.classList.contains('flipped')) return;

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
