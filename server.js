/* global millis */

//websocket server stuff
const express = require("express");

const app = express();
const server = app.listen(3000);

app.use(express.static("public"));

console.log("my server is running");

const socket = require("socket.io");
const io = socket(server);

//constants and variables
const symbols = ["H", "D", "C", "S"];
const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
let gameDeck = [];
let players = [];
let numOfPlayers = 2;
let playerTurn;
let player;

// creates a Player object when connected to server
class Player {
  //id refers to the socket id
  constructor(id) {
    this.deck = [];
    this.id = id;
    this.lost = false;
    this.blackjack = false;
    this.win = false;
    this.handValue = 0;
  }
  // take a card from deck and change hand value accordingly
  takeCard(c) {
    let x = this.deck.push(c);
    this.handValue = this.getHandValue();
  }

  // returns the value of the deck
  getHandValue() {
    let handValue = 0;
    let aceCount = 0;
    for (let c of this.deck) {
      if (c.isAce()) {
        aceCount++;
      } else {
        handValue += c.value;
      }
    }
    // consider the number of ace to determine whether to count it as 1 or 11
    if (aceCount == 1) {
      if (handValue > 10) {
        handValue += 1;
      } else {
        handValue += 11;
      }
    } else if (aceCount >= 2) {
      handValue += aceCount - 1;
      if (handValue > 10) {
        handValue += 1;
      } else {
        handValue += 11;
      }
    }

    return handValue;
  }
  //  check if hand is over 21
  checkBusted() {
    if (this.getHandValue() > 21) {
      this.lost = true;
      playerTurn++;
      console.log("next turn:" + playerTurn);
    }
  }
  //  check if hand is equal to 21 or blackjack for first two cards
  checkWin() {
    if (this.getHandValue() == 21) {
      this.win = true;
      console.log("next turn:" + playerTurn);
      if (this.deck.length == 2) {
        this.blackjack = true;
      }
      playerTurn++;
    }
  }
}

//initiates the dealer object after the Player class is defined
let dealer = new Player("dealer");

//class for card objects part of the game deck
class Card {
  constructor(rank, suit, value) {
    this.rank = rank;
    this.suit = suit;
    this.value = value;
    this.display = rank + "" + suit;
  }

  isAce() {
    return this.rank == "A";
  }
}
// prepares the game deck when all players connected
function gameStart() {
  // initialize the game deck
  for (let i = 0; i < symbols.length; i++) {
    for (let j = 0; j < ranks.length; j++) {
      let value;
      let rank = ranks[j];
      if (rank == "J" || rank == "Q" || rank == "K") {
        value = 10;
      } else if (rank == "A") {
        value = 11;
      } else {
        value = rank;
      }
      gameDeck.push(new Card(ranks[j], symbols[i], value));
    }
  }
  shuffleDeck();
  //give dealer two cards
  for (let i = 0; i < 2; i++) {
    dealer.takeCard(gameDeck.shift());
  }
  dealer.checkBusted();
  dealer.checkWin();
  console.log(dealer.deck);
}

function shuffleDeck() {
  // for 1000 turns
  // switch the values of two random cards
  for (var i = 0; i < 1000; i++) {
    var location1 = Math.floor(Math.random() * gameDeck.length);
    var location2 = Math.floor(Math.random() * gameDeck.length);
    var tmp = gameDeck[location1];

    gameDeck[location1] = gameDeck[location2];
    gameDeck[location2] = tmp;
  }
}

function dealerTurn() {
  console.log("BEFORE: " + dealer.getHandValue());
  while (dealer.getHandValue() < 17) {
    dealer.takeCard(gameDeck.shift());
    console.log("dealer takes a card");
    dealer.checkBusted();
    dealer.checkWin();
  }
  io.emit("turn", "dealer");
  io.emit("game start", players, dealer);
  console.log("AFTER: " + dealer.getHandValue());
  console.log(dealer.deck);
}
/*---------------------------------------------------------------*/

io.on("connection", socket => {
  //adds player when new connection
  console.log("new connection:" + socket.id);
  let newPlayer = new Player(socket.id); // create a new player object
  //playerTurn is always one more than playerId since playerTurn starts at 0 while playerId starts at 1
  let playerId = players.length + 1;
  socket.emit("player's ID", playerId);
  if (players.length <= numOfPlayers) {
    players.push(newPlayer);
  }
  console.log(players);
  console.log(
    `Current player is: player ${playerId}; now there are ${players.length} players`
  );

  // checking if game reach correct amount of player
  if (players.length < numOfPlayers) {
    io.emit("wait", players.length);
    // when the game reaches exactly 3 players and starts
  } else if (players.length == numOfPlayers) {
    // set up: create deck and shuffle
    gameStart();
    // first deal out of cards
    for (let player of players) {
      for (let j = 0; j < 2; j++) {
        player.takeCard(gameDeck.shift());
      }
      player.checkWin();
    }

    console.log(players);
    io.emit("turn", playerTurn);
    io.emit("game start", players, dealer);
    if (playerTurn >= players.length) {
      dealerTurn();
    }
    // if number of players is more than specified, player cannot join
  } else {
    socket.emit("can't join");
  }
  // when player hits "h" key => hit
  socket.on("hit", playerNum => {
    if (playerTurn == playerNum - 1 && playerTurn < players.length) {
      player = players[playerTurn];
      if (!player.lost && !player.win) {
        console.log("Player #" + playerTurn + " hit");
        player.takeCard(gameDeck.shift());
        player.checkBusted();
        player.checkWin();
        io.emit("turn", playerTurn);
        io.emit("game start", players, dealer);
      }
    } else {
      console.log("hello");
    }
    if (
      typeof players[playerTurn] == "undefined" ||
      players[playerTurn].handValue == 0 ||
      players[playerTurn].blackjack
    ) {
      playerTurn++;
    }
    if (playerTurn >= players.length) {
      dealerTurn();
    }
  });
  // when player hits "s" key => stay
  socket.on("stay", playerNum => {
    if (playerTurn == playerNum - 1) {
      playerTurn++;
      console.log("next turn:" + playerTurn);
      io.emit("game start", players, dealer);
      io.emit("turn", playerTurn);
      io.emit("game start", players, dealer);
    } else {
      console.log("hello");
    }
    if (
      typeof players[playerTurn] == "undefined" ||
      players[playerTurn].handValue == 0
    ) {
      playerTurn++;
    }
    if (playerTurn >= players.length) {
      dealerTurn();
    }
  });

  //removes player from players after disconnection
  //must reconnect to game if one person disconnects
  socket.on("disconnect", reason => {
    console.log("client disconnected. playerId: " + playerId);
    players.splice(playerId, 1);
    io.emit("refresh");
    players = [];
    playerTurn = 0;
    dealer = new Player("dealer");
  });
});
