// server/services/pokerEngine.js
class Card {
  constructor(suit, rank) {
    this.suit = suit; // 's', 'h', 'd', 'c'
    this.rank = rank; // 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'
  }

  toString() {
    return this.rank + this.suit;
  }

  getValue() {
    if (this.rank === 'A') return 14;
    if (this.rank === 'K') return 13;
    if (this.rank === 'Q') return 12;
    if (this.rank === 'J') return 11;
    return parseInt(this.rank);
  }
}

class Deck {
  constructor() {
    this.reset();
  }

  reset() {
    this.cards = [];
    const suits = ['s', 'h', 'd', 'c']; // spades, hearts, diamonds, clubs
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(new Card(suit, rank));
      }
    }
    
    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count = 1) {
    if (this.cards.length < count) {
      throw new Error('Not enough cards in deck');
    }
    return this.cards.splice(0, count);
  }

  remainingCards() {
    return this.cards.length;
  }
}

class HandEvaluator {
  static evaluateHand(cards) {
    // cards is array of 5-7 Card objects
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate hand');
    }

    // Get all possible 5-card combinations
    const combinations = this.getCombinations(cards, 5);
    let bestHand = null;
    let bestRank = 0;

    for (const combo of combinations) {
      const handRank = this.rankHand(combo);
      if (handRank.rank > bestRank) {
        bestRank = handRank.rank;
        bestHand = handRank;
      }
    }

    return bestHand;
  }

  static getCombinations(cards, size) {
    if (size === 1) return cards.map(card => [card]);
    if (size === cards.length) return [cards];

    const combinations = [];
    for (let i = 0; i <= cards.length - size; i++) {
      const smallerCombos = this.getCombinations(cards.slice(i + 1), size - 1);
      for (const combo of smallerCombos) {
        combinations.push([cards[i], ...combo]);
      }
    }
    return combinations;
  }

  static rankHand(cards) {
    const suits = cards.map(card => card.suit);
    const ranks = cards.map(card => card.getValue()).sort((a, b) => b - a);
    
    const isFlush = suits.every(suit => suit === suits[0]);
    const isStraight = this.isStraight(ranks);
    const rankCounts = this.getRankCounts(ranks);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Royal Flush
    if (isFlush && isStraight && ranks[0] === 14 && ranks[4] === 10) {
      return { rank: 9, name: 'Royal Flush', cards: ranks };
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return { rank: 8, name: 'Straight Flush', cards: ranks };
    }

    // Four of a Kind
    if (counts[0] === 4) {
      return { rank: 7, name: 'Four of a Kind', cards: ranks };
    }

    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
      return { rank: 6, name: 'Full House', cards: ranks };
    }

    // Flush
    if (isFlush) {
      return { rank: 5, name: 'Flush', cards: ranks };
    }

    // Straight
    if (isStraight) {
      return { rank: 4, name: 'Straight', cards: ranks };
    }

    // Three of a Kind
    if (counts[0] === 3) {
      return { rank: 3, name: 'Three of a Kind', cards: ranks };
    }

    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: 2, name: 'Two Pair', cards: ranks };
    }

    // One Pair
    if (counts[0] === 2) {
      return { rank: 1, name: 'One Pair', cards: ranks };
    }

    // High Card
    return { rank: 0, name: 'High Card', cards: ranks };
  }

  static isStraight(ranks) {
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i] - ranks[i + 1] !== 1) {
        // Check for A-5 straight (wheel)
        if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
          return true;
        }
        return false;
      }
    }
    return true;
  }

  static getRankCounts(ranks) {
    const counts = {};
    for (const rank of ranks) {
      counts[rank] = (counts[rank] || 0) + 1;
    }
    return counts;
  }
}

class PokerGame {
  constructor(tableId, players, smallBlind, bigBlind) {
    this.tableId = tableId;
    this.players = players.map((player, index) => ({
      ...player,
      position: index,
      cards: [],
      hasActed: false,
      currentBet: 0,
      totalInvested: 0,
      isAllIn: false,
      isFolded: false,
      isActive: true
    }));
    
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.dealerPosition = 0;
    this.currentPlayerIndex = 0;
    this.gamePhase = 'preflop'; // preflop, flop, turn, river, showdown
    this.bettingRound = 0;
    this.gameHistory = [];
  }

  startNewHand() {
    console.log(`Starting new hand for table ${this.tableId}`);
    
    // Reset for new hand
    this.deck.reset();
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.gamePhase = 'preflop';
    this.bettingRound = 0;
    
    // Reset players
    this.players.forEach(player => {
        player.cards = [];
        player.hasActed = false;
        player.currentBet = 0;
        player.totalInvested = 0;
        player.isAllIn = false;
        player.isFolded = false;
        player.action = undefined;
    });

    // Move dealer button
    this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
    
    // Set blinds
    this.setBlinds();
    
    // Deal hole cards
    this.dealHoleCards();
    
    // Start betting with player after big blind
    const bigBlindPos = this.getBigBlindPosition();
    this.currentPlayerIndex = this.getNextActivePlayer((bigBlindPos + 1) % this.players.length);
    
    // IMPORTANT FIX: If no active player found, find the first active player
    if (this.currentPlayerIndex === -1) {
        this.currentPlayerIndex = this.getNextActivePlayer(0);
    }
    
    console.log(`Current player index: ${this.currentPlayerIndex}`);
    if (this.currentPlayerIndex >= 0) {
        console.log(`Current player: ${this.players[this.currentPlayerIndex].username}`);
    }
    
    this.logAction('game', 'New hand started');
    return this.getGameState();
    }

  setBlinds() {
    const sbPosition = this.getSmallBlindPosition();
    const bbPosition = this.getBigBlindPosition();
    
    // Clear previous blind markers
    this.players.forEach(player => {
      player.isSmallBlind = false;
      player.isBigBlind = false;
      player.isDealer = false;
    });
    
    // Set new positions
    this.players[this.dealerPosition].isDealer = true;
    this.players[sbPosition].isSmallBlind = true;
    this.players[bbPosition].isBigBlind = true;
    
    // Post blinds
    this.playerBet(sbPosition, this.smallBlind, 'small-blind');
    this.playerBet(bbPosition, this.bigBlind, 'big-blind');
    
    this.currentBet = this.bigBlind;
  }

  getSmallBlindPosition() {
    if (this.players.length === 2) {
      return this.dealerPosition; // Heads up: dealer posts small blind
    }
    return (this.dealerPosition + 1) % this.players.length;
  }

  getBigBlindPosition() {
    if (this.players.length === 2) {
      return (this.dealerPosition + 1) % this.players.length;
    }
    return (this.dealerPosition + 2) % this.players.length;
  }

  dealHoleCards() {
    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        if (player.isActive && player.chips > 0) {
          player.cards.push(this.deck.deal(1)[0]);
        }
      }
    }
  }

  playerAction(playerId, action, amount = 0) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.players[this.currentPlayerIndex].id.toString() !== playerId.toString()) {
      throw new Error('Not your turn');
    }

    if (player.isFolded || player.isAllIn) {
      throw new Error('Cannot act - player is folded or all-in');
    }

    let actionResult = {};

    switch (action) {
      case 'fold':
        actionResult = this.playerFold(player);
        break;
      case 'call':
        actionResult = this.playerCall(player);
        break;
      case 'bet':
        actionResult = this.playerBetAction(player, amount);
        break;
      case 'raise':
        actionResult = this.playerRaise(player, amount);
        break;
      case 'check':
        actionResult = this.playerCheck(player);
        break;
      case 'all-in':
        actionResult = this.playerAllIn(player);
        break;
      default:
        throw new Error('Invalid action');
    }

    player.hasActed = true;
    player.action = action;
    
    this.logAction(player.username, `${action}${amount ? ` $${amount}` : ''}`);
    
    // Move to next player or next phase
    this.advanceGame();
    
    return {
      success: true,
      gameState: this.getGameState(),
      ...actionResult
    };
  }

  playerFold(player) {
    player.isFolded = true;
    return { action: 'fold' };
  }

  playerCall(player) {
    const callAmount = this.currentBet - player.currentBet;
    return this.playerBet(this.players.indexOf(player), callAmount, 'call');
  }

  playerCheck(player) {
    if (this.currentBet > player.currentBet) {
      throw new Error('Cannot check - must call or fold');
    }
    return { action: 'check' };
  }

  playerBetAction(player, amount) {
    // Validate this is actually a bet scenario (no current bet)
    if (this.currentBet > 0) {
      throw new Error('Cannot bet - there is already a bet. Use raise instead.');
    }

    // Minimum bet is big blind
    const minBet = this.bigBlind;
    if (amount < minBet) {
      throw new Error(`Minimum bet is $${minBet}`);
    }

    if (player.chips < amount) {
      throw new Error('Insufficient chips for bet');
    }

    const result = this.playerBet(this.players.indexOf(player), amount, 'bet');
    this.currentBet = player.currentBet;

    // Reset hasActed for all other players since there was a bet
    this.players.forEach(p => {
      if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
        p.hasActed = false;
      }
    });

    return result;
  }

  playerRaise(player, amount) {
    // Validate this is actually a raise scenario (there is a current bet)
    if (this.currentBet === 0) {
      throw new Error('Cannot raise - no bet to raise. Use bet instead.');
    }

    const callAmount = this.currentBet - player.currentBet;
    
    // Amount should be the TOTAL new bet, not just the raise amount
    // Minimum raise is at least double the current bet
    const minRaise = this.currentBet * 2;
    
    if (amount < minRaise) {
      throw new Error(`Minimum raise is to $${minRaise}`);
    }
    
    if (player.chips < amount) {
      throw new Error('Insufficient chips for raise');
    }
    
    const totalBet = amount - player.currentBet;
    const result = this.playerBet(this.players.indexOf(player), totalBet, 'raise');
    this.currentBet = player.currentBet;
    
    // Reset hasActed for all other players since there was a raise
    this.players.forEach(p => {
      if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
        p.hasActed = false;
      }
    });
    
    return result;
  }

  playerAllIn(player) {
    const allInAmount = player.chips;
    const result = this.playerBet(this.players.indexOf(player), allInAmount, 'all-in');
    player.isAllIn = true;
    
    if (player.currentBet > this.currentBet) {
      this.currentBet = player.currentBet;
      // Reset hasActed for other players if all-in creates a raise
      this.players.forEach(p => {
        if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
          p.hasActed = false;
        }
      });
    }
    
    return result;
  }

  playerBet(playerIndex, amount, actionType) {
    const player = this.players[playerIndex];
    const actualAmount = Math.min(amount, player.chips);
    
    player.chips -= actualAmount;
    player.currentBet += actualAmount;
    player.totalInvested += actualAmount;
    this.pot += actualAmount;
    
    if (player.chips === 0) {
      player.isAllIn = true;
    }
    
    return {
      action: actionType,
      amount: actualAmount,
      playerChips: player.chips,
      currentBet: player.currentBet
    };
  }

  advanceGame() {
    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.nextPhase();
    } else {
      this.nextPlayer();
    }
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => !p.isFolded && p.isActive);
    
    // If only one player left, betting is complete
    if (activePlayers.length <= 1) {
      return true;
    }
    
    // Check if all active players have acted and matched the current bet (or are all-in)
    for (const player of activePlayers) {
      if (!player.hasActed && !player.isAllIn) {
        return false;
      }
      if (player.currentBet < this.currentBet && !player.isAllIn) {
        return false;
      }
    }
    
    return true;
  }

  nextPlayer() {
    this.currentPlayerIndex = this.getNextActivePlayer((this.currentPlayerIndex + 1) % this.players.length);
  }

  getNextActivePlayer(startIndex) {
    if (this.players.length === 0) return -1;
    
    let index = startIndex;
    let attempts = 0;
    const maxAttempts = this.players.length;
    
    do {
        if (this.players[index] && 
            !this.players[index].isFolded && 
            !this.players[index].isAllIn && 
            this.players[index].isActive &&
            this.players[index].chips > 0) {
        return index;
        }
        index = (index + 1) % this.players.length;
        attempts++;
    } while (index !== startIndex && attempts < maxAttempts);
    
    return -1; // No active players found
    }

  nextPhase() {
    // Reset betting round variables
    this.players.forEach(player => {
        player.hasActed = false;
        player.currentBet = 0;
    });
    this.currentBet = 0;
    this.bettingRound++;

    switch (this.gamePhase) {
        case 'preflop':
        this.gamePhase = 'flop';
        this.dealFlop();
        break;
        case 'flop':
        this.gamePhase = 'turn';
        this.dealTurn();
        break;
        case 'turn':
        this.gamePhase = 'river';
        this.dealRiver();
        break;
        case 'river':
        this.gamePhase = 'showdown';
        this.showdown();
        return;
        default:
        // Game over, start new hand
        this.startNewHand();
        return;
    }

    // Start betting with first active player after dealer
    this.currentPlayerIndex = this.getNextActivePlayer((this.dealerPosition + 1) % this.players.length);
    
    // If no active player found after dealer, start from beginning
    if (this.currentPlayerIndex === -1) {
        this.currentPlayerIndex = this.getNextActivePlayer(0);
    }
    
    console.log(`Next phase: ${this.gamePhase}, Current player: ${this.currentPlayerIndex >= 0 ? this.players[this.currentPlayerIndex].username : 'none'}`);
    }

  dealFlop() {
    this.deck.deal(1); // Burn card
    this.communityCards.push(...this.deck.deal(3));
    this.logAction('game', 'Flop dealt');
  }

  dealTurn() {
    this.deck.deal(1); // Burn card
    this.communityCards.push(...this.deck.deal(1));
    this.logAction('game', 'Turn dealt');
  }

  dealRiver() {
    this.deck.deal(1); // Burn card
    this.communityCards.push(...this.deck.deal(1));
    this.logAction('game', 'River dealt');
  }

  showdown() {
    const activePlayers = this.players.filter(p => !p.isFolded && p.isActive);
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      activePlayers[0].chips += this.pot;
      this.logAction(activePlayers[0].username, `wins $${this.pot} (no showdown)`);
    } else {
      // Evaluate hands and determine winner(s)
      this.evaluateShowdown(activePlayers);
    }
    
    this.gamePhase = 'finished';
  }

  evaluateShowdown(players) {
    const playerHands = players.map(player => ({
      player,
      hand: HandEvaluator.evaluateHand([...player.cards, ...this.communityCards])
    }));

    // Sort by hand strength (highest first)
    playerHands.sort((a, b) => {
      if (a.hand.rank !== b.hand.rank) {
        return b.hand.rank - a.hand.rank;
      }
      // Compare high cards for same rank
      for (let i = 0; i < a.hand.cards.length; i++) {
        if (a.hand.cards[i] !== b.hand.cards[i]) {
          return b.hand.cards[i] - a.hand.cards[i];
        }
      }
      return 0; // Tie
    });

    // Determine winners (players with same best hand)
    const bestHand = playerHands[0].hand;
    const winners = playerHands.filter(ph => 
      ph.hand.rank === bestHand.rank && 
      JSON.stringify(ph.hand.cards) === JSON.stringify(bestHand.cards)
    );

    // Split pot among winners
    const winAmount = Math.floor(this.pot / winners.length);
    winners.forEach(winner => {
      winner.player.chips += winAmount;
      this.logAction(winner.player.username, `wins $${winAmount} with ${winner.hand.name}`);
    });
  }

  getGameState() {
    const currentPlayerId = this.currentPlayerIndex >= 0 && this.currentPlayerIndex < this.players.length 
        ? this.players[this.currentPlayerIndex].id 
        : null;
    
    return {
        tableId: this.tableId,
        gamePhase: this.gamePhase,
        pot: this.pot,
        currentBet: this.currentBet,
        currentPlayer: currentPlayerId,
        dealerPosition: this.dealerPosition,
        communityCards: this.communityCards.map(card => card.toString()),
        players: this.players.map(player => ({
        id: player.id,
        username: player.username,
        chips: player.chips,
        currentBet: player.currentBet,
        isDealer: player.isDealer,
        isSmallBlind: player.isSmallBlind,
        isBigBlind: player.isBigBlind,
        isFolded: player.isFolded,
        isAllIn: player.isAllIn,
        hasActed: player.hasActed,
        action: player.action,
        cards: player.cards.map(card => card.toString()) // In real game, only show to player
        })),
        bettingRound: this.bettingRound,
        gameHistory: this.gameHistory.slice(-10) // Last 10 actions
    };
    }

  logAction(player, action) {
    const logEntry = {
      timestamp: new Date(),
      player,
      action,
      pot: this.pot,
      phase: this.gamePhase
    };
    this.gameHistory.push(logEntry);
    console.log(`[${this.tableId}] ${player}: ${action} (Pot: $${this.pot})`);
  }
}

module.exports = {
  Card,
  Deck,
  HandEvaluator,
  PokerGame
};