const POKER_ANALYSIS_SYSTEM_PROMPT = `You are an expert poker coach and strategist with deep knowledge of GTO (Game Theory Optimal) play, exploitative strategies, and hand analysis.

**IMPORTANT:** Some hands may have incomplete data. When data is missing:
- Clearly state what information is unavailable
- Still provide analysis on what IS available
- Make reasonable assumptions when necessary and state them explicitly
- Focus on observable actions and outcomes

When analyzing hands with complete information, focus on:

**PREFLOP ANALYSIS:**
- Starting hand selection and range construction
- Position-based strategy (Early/Middle/Late/Blinds)
- 3-bet/4-bet/fold decisions and frequencies
- Stack-to-pot ratio (SPR) planning
- ICM considerations if applicable

**POSTFLOP STRATEGY:**
- Board texture classification (wet/dry, static/dynamic, connected/disconnected)
- Range advantage analysis
- Continuation betting strategy
- Check-raise, check-call, check-fold spots
- Turn and river decision trees

**BET SIZING:**
- Relationship between bet size and range composition
- Polarized vs linear/merged ranges
- Pot geometry and pot odds
- Implied odds considerations
- Optimal sizing for value vs bluffs (typically 60-75% pot)

**PLAYER DYNAMICS & RANGES:**
- How each action narrows or defines player ranges
- Exploitative adjustments based on tendencies
- Table position and relative position
- Stack depth effects on playable ranges

**CRITICAL DECISION POINTS:**
- Identify pivotal moments in the hand
- Discuss alternative lines and their EVs
- Explain the information each action reveals

**IMPROVEMENT AREAS:**
- Specific mistakes with clear explanations
- Better lines that could have been taken
- Study recommendations

Use concrete numbers: pot sizes in BB, stack depths, exact SPRs. Reference specific streets and actions. Be direct about mistakes but constructive in feedback.`;

const POKER_FOLLOWUP_PROMPT = `You are continuing a poker coaching session about a specific hand. Answer follow-up questions with:
- Specific, actionable advice
- References to the exact actions in the hand being discussed
- Alternative strategies when relevant
- Clear explanations of poker concepts
- GTO principles balanced with exploitative considerations

Keep responses concise but thorough. Use examples from the hand to illustrate points.`;

function formatHandForAnalysis(hand) {
  const allPlayers = hand.all_players || [];
  
  let summary = `# HAND DETAILS\n\n`;
  summary += `**Game:** ${hand.table_id}\n`;
  summary += `**Stakes:** $${hand.small_blind}/$${hand.big_blind}\n`;
  summary += `**Final Pot:** $${hand.pot_size}\n`;
  summary += `**Date:** ${new Date(hand.started_at).toLocaleString()}\n\n`;

  // Player lineup with positions and starting stacks
  summary += `## PLAYER LINEUP\n\n`;
  allPlayers.forEach((player, idx) => {
    const startingStack = player.starting_chips || 'Unknown';
    const position = getPositionLabel(idx, allPlayers.length);
    const bbStack = hand.big_blind ? (startingStack / hand.big_blind).toFixed(1) : 'N/A';
    
    summary += `**${player.username}** (${position}): $${startingStack} (${bbStack}bb)`;
    
    // ✅ Include hole cards if available
    if (player.cards && player.cards.length > 0) {
      const cards = Array.isArray(player.cards) ? player.cards : 
                    (typeof player.cards === 'string' ? JSON.parse(player.cards) : []);
      if (cards.length > 0) {
        summary += ` | **Hole Cards: ${cards.join(' ')}**`;
      }
    }
    
    // Show final hand rank if went to showdown
    if (player.final_hand_rank) {
      summary += ` | Final Hand: ${player.final_hand_rank}`;
    }
    
    summary += `\n`;
  });

  // Community cards with better formatting
  summary += `\n## BOARD\n\n`;
  const boardCards = [];
  if (hand.board_flop) {
    const flop = typeof hand.board_flop === 'string' 
      ? JSON.parse(hand.board_flop) 
      : hand.board_flop;
    boardCards.push(`**Flop:** ${flop.join(' ')}`);
  }
  if (hand.board_turn) boardCards.push(`**Turn:** ${hand.board_turn}`);
  if (hand.board_river) boardCards.push(`**River:** ${hand.board_river}`);
  
  if (boardCards.length > 0) {
    summary += boardCards.join(' | ') + '\n';
  } else {
    summary += '*Hand ended preflop*\n';
  }

  // Action by street with more context
  if (hand.actions && hand.actions.length > 0) {
    summary += `\n## ACTION SEQUENCE\n\n`;
    let currentPhase = '';
    let streetPot = (hand.small_blind || 0) + (hand.big_blind || 0);
    
    hand.actions.forEach((action) => {
      if (action.phase !== currentPhase) {
        currentPhase = action.phase;
        summary += `\n### ${currentPhase.toUpperCase()}\n`;
        if (action.pot) streetPot = action.pot;
      }
      
      const player = action.player || 'Dealer';
      const actionText = action.action;
      
      // Build action description
      let actionLine = `- **${player}**: ${actionText}`;
      
      // Add pot context if available
      if (action.pot) {
        actionLine += ` (Pot: $${action.pot})`;
      }
      
      summary += actionLine + '\n';
    });
  } else {
    summary += `\n## ACTION SEQUENCE\n\n*No detailed actions recorded*\n`;
  }

  // Results with more detail
  summary += `\n## RESULTS\n\n`;
  allPlayers.forEach((player) => {
    const profit = player.profit || 0;
    const profitStr = profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`;
    const profitBB = hand.big_blind ? ` (${(profit / hand.big_blind).toFixed(1)}bb)` : '';
    const winnerTag = player.is_winner ? ' 🏆' : '';
    
    summary += `**${player.username}**: ${profitStr}${profitBB}${winnerTag}`;
    
    if (player.final_hand_rank) {
      summary += ` - ${player.final_hand_rank}`;
    }
    
    if (player.folded_at) {
      summary += ` (folded on ${player.folded_at})`;
    }
    
    summary += `\n`;
  });

  // Calculate and add important metrics
  const avgStack = allPlayers.reduce((sum, p) => sum + (p.starting_chips || 0), 0) / allPlayers.length;
  const startingPot = (hand.small_blind || 0) + (hand.big_blind || 0);
  const spr = hand.big_blind ? (avgStack / startingPot).toFixed(1) : 'N/A';
  
  summary += `\n---\n`;
  summary += `*Average starting stack: $${avgStack.toFixed(0)} | SPR: ${spr} | Players: ${allPlayers.length}*\n`;

  return summary;
}

function getPositionLabel(index, totalPlayers) {
  if (totalPlayers === 2) {
    return index === 0 ? 'BTN/SB' : 'BB';
  }
  
  const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'CO'];
  return positions[index] || `Position ${index + 1}`;
}

module.exports = {
  POKER_ANALYSIS_SYSTEM_PROMPT,
  POKER_FOLLOWUP_PROMPT,
  formatHandForAnalysis
};