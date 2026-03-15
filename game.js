const CARD_LETTERS = [
  'A','B','C','D','E','F','G','H','I','J',
  'K','L','M','N','O','P','Q','R','S'
];

const CARD_BACK = 'cards/card back.png';

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

function preloadImages() {
  const sources = [CARD_BACK];

  for (const letter of CARD_LETTERS) {
    sources.push(`cards/${letter}1.png`);
    sources.push(`cards/${letter}2.png`);
  }

  return Promise.all(
    sources.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });
    })
  );
}

function buildDeck() {
  const cards = [];

  for (const letter of CARD_LETTERS) {
    cards.push({
      id: `${letter}1`,
      pairId: letter,
      frontImage: `cards/${letter}1.png`,
      alt: `כרטיס ${letter}1`
    });

    cards.push({
      id: `${letter}2`,
      pairId: letter,
      frontImage: `cards/${letter}2.png`,
      alt: `כרטיס ${letter}2`
    });
  }

  return shuffle(cards);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
        <img src="${CARD_BACK}" alt="גב הכרטיס" draggable="false" />
      </div>
      <div class="card-face card-front">
        <img src="${cardData.frontImage}" alt="${cardData.alt}" draggable="false" />
      </div>
    </div>
  `;

  card.addEventListener('click', () => onCardClick(card));
  return card;
}

function renderBoard() {
  gameBoard.innerHTML = '';
  const fragment = document.createDocumentFragment();
  deck.forEach(cardData => fragment.appendChild(createCardElement(cardData)));
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
    await preloadImages();
    resetState();
    renderBoard();
    showScreen(gameScreen);
  } catch (error) {
    console.error(error);
    alert('יש בעיה בטעינת התמונות. בדקי שכל הקבצים נמצאים בתוך התיקייה cards ב-GitHub.');
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
