/* global io, text, keyIsPressed, keyCode, createCanvas, background, millis, loadImage, image, backgroundImg, createButton, fill, stoke, width, height, textAlign, CENTER, RIGHT, LEFT
 *  textSize, textFont, loadFont, windowWidth, windowHeight*/

let socket = io.connect("https://we-cant-deal-with-this.glitch.me");
const symbols = ["H", "D", "C", "S"];
const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];

let players;
let dealer;

//background image and color variables
let cardImage;
let backgroundImg;
let fontBold;
let modeColor;
let symbolsImg;
let playerNum; //basically the player index (displayed on the canva)
let currentNum; //the number of players who have joined the game
let playerTurn; //player's index - 1 (for tracking in the list)

function preload() {
  cardImage = loadImage(
    "https://cdn.glitch.com/0a503499-9676-43a6-97ff-d0827c6d5f07%2F8Txrpy8ac.png?v=1628034511973"
  );

  backgroundImg = loadImage(
    "https://cdn.glitch.com/0a503499-9676-43a6-97ff-d0827c6d5f07%2Fcasino%20background.jpg?v=1628037044386"
  );

  fontBold = loadFont(
    "https://cdn.glitch.com/fc50fa92-40f1-4250-97b8-3dbb54063194%2FBebas-Regular.ttf?v=1628179075731"
  );

  symbolsImg = loadImage(
    "https://cdn.glitch.com/fc50fa92-40f1-4250-97b8-3dbb54063194%2Fsymbols1.png?v=1628219947549"
  );
}

function setup() {
  modeColor = "forestgreen";
  createCanvas(windowWidth - 20, windowHeight - 20);
  textFont(fontBold);
  textSize(20);

  //retrieves the current player's id from the server
  socket.on("player's ID", playerId => {
    playerNum = playerId;
  });

  //creates the wait screen and shows how many player are currently online
  socket.on("wait", currentNum => {
    currentNum = currentNum;
    background("white");
    fill(modeColor);
    textAlign(CENTER);
    textSize(40);
    text(`We can't "deal" with this`, width / 2, height / 2 - 110);
    image(symbolsImg, width / 2 - 180, height / 2 - 85, 714 / 2, 185 / 2);
    textSize(20);
    text(`PLEASE WAIT FOR MORE USERS TO JOIN`, width / 2, height / 2 + 50);
    text(`${currentNum} USERS HAVE JOINED`, width / 2, height / 2 + 90);
    fill("black");
    text(
      `WARNING: DO NOT DISCONNECT OR REFRESH.`,
      width / 2,
      height - 50
    );
    fill(modeColor);
  });

  //shows that a new player has joined, called by the server
  socket.on("new player", id => {
    text(`Player ${id} Joined`, width / 2, height / 2 + 20);
  });

  //responsible for displaying the player and dealer's hands, called by the server repeatedly for display purposes
  socket.on("game start", (playersData, dealerData) => {
    textAlign(LEFT);
    fill("white");
    text("H for Hit | S for Stay", 50, height - 50);
    fill(modeColor);
    players = playersData;
    dealer = dealerData;
    //Drawing each players hands
    for (let i = 0; i < players.length; i++) {
      let player = players[i];
      console.log(player.deck);
      if (playerNum == i + 1) {
        fill("white");
      }
      if (player.handValue != 0) {
        text(`Player  #${i + 1} =>`, 40, 60 + i * 80);
        text(`Value: ${player.handValue}`, 40, 80 + i * 80);
      }
      fill(modeColor);

      //Displaying the individual cards of the player's hand
      for (let j = 0; j < player.deck.length; j++) {
        drawCard(player.deck[j], 140 + j * 50, 45 + i * 80);
      }

      if (player.lost) {
        textSize(25);
        textAlign(CENTER);
        fill("black");
        text("BUST", 135 + (player.deck.length / 2) * 50, 85 + i * 80);
        fill(modeColor);
        textSize(20);
        textAlign(LEFT);
      }
      if (player.win) {
        textSize(25);
        textAlign(CENTER);
        fill("black");
        if (player.blackjack) {
          text("BLACKJACK", 135 + (player.deck.length / 2) * 50, 85 + i * 80);
        } else {
          text("TWENTY ONE", 135 + (player.deck.length / 2) * 50, 85 + i * 80);
        }
        fill(modeColor);
        textSize(20);
        textAlign(LEFT);
      }
    }

    //Draw the dealer's hand
    if (playerTurn != "dealer") {
      //only show one card
      text(`Dealer => `, 40, 60 + players.length * 80);
      drawCard(dealer.deck[0], 140, 45 + players.length * 80);
    } else {
      // show all cards
      text(`Dealer => `, 40, 60 + players.length * 80);
      text(`Value: ${dealer.handValue}`, 40, 80 + players.length * 80);
      for (let i = 0; i < dealer.deck.length; i++) {
        drawCard(dealer.deck[i], 140 + i * 50, 45 + players.length * 80);
      }
      if (dealer.lost) {
        textSize(25);
        textAlign(CENTER);
        fill("black");
        text(
          "BUST",
          135 + (dealer.deck.length / 2) * 50,
          85 + players.length * 80
        );
        fill(modeColor);
        textSize(20);
        textAlign(LEFT);
      }
      if (dealer.win) {
        textSize(25);
        textAlign(CENTER);
        fill("black");
        if (dealer.blackjack) {
          text(
            "BLACKJACK",
            135 + (dealer.deck.length / 2) * 50,
            85 + players.length * 80
          );
        } else {
          text(
            "TWENTY ONE",
            135 + (dealer.deck.length / 2) * 50,
            85 + players.length * 80
          );
        }
        fill(modeColor);
        textSize(20);
        textAlign(LEFT);
      }
      let winnersList = whoWins(dealer, players);
      textAlign(LEFT);

      text("WINNERS: ", width - 110, 50);

      if (winnersList.length == 0 && !dealer.lost) {
        text("Dealer", width - 110, 80);
      } else {
        for (let i = 0; i < winnersList.length; i++) {
          text(`Player ${winnersList[i]}`, width - 110, 80 + i * 30);
        }
      }
    }
  });

  //display a message on the lower right corner of the screen about which player is currently playing
  socket.on("turn", playing => {
    background(backgroundImg);
    textAlign(RIGHT);
    playerTurn = playing;
    if (playing != "dealer") {
      fill(modeColor);
      if (playerNum == playing + 1) {
        fill("white");
      }
      text(
        `Currently Playing: Player #${playerTurn + 1}`,
        width - 50,
        height - 50
      );
    } else {
      console.log("dealer's turn");
      text(`Currently Playing: Dealer`, width - 50, height - 50);
    }
    fill(modeColor);
  });

  //display the can't join screen, due to too many players
  socket.on("can't join", () => {
    background(0);
    fill(modeColor);
    textAlign(CENTER);
    text(
      `LIMIT HAS BEEN REACHED. PLEASE WAIT AND WATCH THE CURRENT GAME.`,
      width / 2,
      height / 2 - 20
    );
    fill("white");
    text(
      `WARNING: DO NOT DISCONNECT.`,
      width / 2,
      height / 2 + 20
    );
  });

  //display the page that asks the player to refresh
  socket.on("refresh", () => {
    background(0);
    fill("white");
    textAlign(CENTER);
    text(`PLEASE RECONNECT`, width / 2, height / 2);
  });
}

function draw() {}

// draw the card based on the x aand y value inputted, the location of the card on the image is retrieved based on the card's suit and rank
function drawCard(card, x, y) {
  let sourceY = symbols.indexOf(card.suit);
  let sourceX = ranks.indexOf(card.rank);
  //console.log("(" + sourceX + ", " + sourceY + ")");
  image(
    cardImage,
    x,
    y,
    125 / 3,
    182 / 3,
    sourceX * 125,
    sourceY * 182,
    125,
    182
  );
}

function keyPressed() {
  if (keyCode === 72) {
    //h key
    console.log("hit");
    socket.emit("hit", playerNum);
  }
  if (keyCode === 83) {
    //s key
    console.log("stay");
    socket.emit("stay", playerNum);
  }
}

// checks for who is the winner and returns a list of winner's index
function whoWins(dealer, players) {
  let winners = [];
  for (let i = 0; i < players.length; i++) {
    let player = players[i];

    if (!dealer.lost) {
      if (player.lost || player.handValue == 0) {
        continue;
      }
      if (player.handValue > dealer.handValue) {
        winners.push(i + 1);
      }
    } else {
      if (!player.lost && player.handValue != 0) {
        winners.push(i + 1);
      }
    }
  }
  //console.log(winners);
  return winners;
}
