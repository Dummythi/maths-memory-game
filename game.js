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

const FOLDER_CANDIDATES = ['', 'cards/', 'assets/'];
const BACK_NAME_CANDIDATES = ['card back.png', 'card-back.png', 'card_back.png'];

function testImage(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);

    img.src = encodeURI(src) + `?v=${Date.now()}`;
  });
}

async function findExistingImagePath(candidates) {
  for (const candidate of candidates) {
    const ok = await testImage(candidate);
    if (ok) return candidate;
  }
  return null;
}

async function resolveAssets() {
  const backCandidates = [];

  for (const folder of FOLDER_CANDIDATES) {
    for (const backName of BACK_NAME_CANDIDATES) {
      backCandidates.push(`${folder}${backName}`);
    }
  }

  const foundBack = await findExistingImagePath(backCandidates);
  if (!foundBack) {
    throw new Error('Back image not found.');
  }
  resolvedBackImage = foundBack;

  for (const letter of CARD_LETTERS) {
    for (const side of ['1', '2']) {
      const fileName = `${letter}${side}.png`;
      const frontCandidates = FOLDER_CANDIDATES.map(folder => `${folder}${fileName}`);
      const foundFront = await findExistingImagePath(frontCandidates);

      if (!foundFront) {
        throw new Error(`Front image not found: ${fileName}`);
      }

      resolvedFrontImages[`${letter}${side}`] = foundFront;
    }
  }
}

function ensureAssetsReady() {
  if (!assetsReadyPromise) {
    assetsReadyPromise = resolveAssets();
  }
  return assetsReadyPromise;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const cards = [];

  for (const letter of CARD_LETTERS) {
    cards.push({
      id: `${letter}1`,
      pairId: letter,
      frontImage: resolvedFrontImages[`${letter}1`],
      alt: `כרטיס ${letter}1`
    });

    cards.push({
      id: `${letter}2`,
      pairId: letter,
      frontImage: resolvedFrontImages[`${letter}2`],
      alt: `כרטיס ${letter}2`
    });
  }

  return shuffle(cards);
}

function showScreen(screen) {
  [startScreen, gameScreen, winScreen].forEach(section => {
    section.classList.toggle('active', section === screen);
  });
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
        <img src="${encodeURI(resolvedBackImage)}" alt="גב הכרטיס" draggable="false" />
      </div>
      <div class="card-face card-front">
        <img src="${encodeURI(cardData.frontImage)}" alt="${cardData.alt}" draggable="false" />
      </div>
    </div>
  `;

  card.addEventListener('click', () => onCardClick(card));
  return card;
}

function renderBoard() {
  gameBoard.innerHTML = '';
  const fragment = document.createDocumentFragment();

  deck.forEach(cardData => {
    fragment.appendChild(createCardElement(cardData));
  });

  gameBoard.appendChild(fragment);
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function handleMatch(firstCard, secondCard) {
  firstCard.classList.add('matched');
  secondCard.classList.add('matched');
  firstCard.disabled = true;
  secondCard.disabled = true;

  matchedPairs += 1;
  pairsFoundText.textContent = String(matchedPairs);

  window.setTimeout(() => {
    firstCard.style.visibility = 'hidden';
    secondCard.style.visibility = 'hidden';
    flippedCards = [];
    lockBoard = false;

    if (matchedPairs === CARD_LETTERS.length) {
      window.setTimeout(() => showScreen(winScreen), 250);
    }
  }, 500);
}

function handleMismatch(firstCard, secondCard) {
  window.setTimeout(() => {
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

  const [firstCard, secondCard] = flippedCards;
  const isMatch = firstCard.dataset.pairId === secondCard.dataset.pairId;

  if (isMatch) {
    handleMatch(firstCard, secondCard);
  } else {
    handleMismatch(firstCard, secondCard);
  }
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
    alert('יש בעיה בטעינת התמונות. בדקי שכל הקבצים הועלו ל-GitHub.');
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
ensureAssetsReady().catch(console.error);
