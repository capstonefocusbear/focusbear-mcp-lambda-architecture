// Validate that the response is appropriate motivational content
(output, context) => {
  const response = output.trim();
  
  // Check if response exists and is not empty
  if (!response || response.length < 10) {
    return {
      pass: false,
      score: 0,
      reason: 'Response is too short or empty'
    };
  }
  
  // Check if response is encouraging/motivational
  const motivationalWords = [
    'you can', 'great job', 'keep going', 'awesome', 'excellent', 
    'proud', 'amazing', 'fantastic', 'well done', 'impressive',
    'focus', 'concentrate', 'stay strong', 'believe', 'achieve'
  ];
  
  const hasMotivationalContent = motivationalWords.some(word => 
    response.toLowerCase().includes(word.toLowerCase())
  );
  
  // Check if response is positive (no negative words)
  const negativeWords = ['terrible', 'awful', 'horrible', 'useless', 'failure'];
  const hasNegativeContent = negativeWords.some(word => 
    response.toLowerCase().includes(word.toLowerCase())
  );
  
  if (hasNegativeContent) {
    return {
      pass: false,
      score: 0,
      reason: 'Response contains negative language'
    };
  }
  
  if (hasMotivationalContent) {
    return {
      pass: true,
      score: 1,
      reason: 'Response is appropriately motivational'
    };
  }
  
  // Neutral but acceptable response
  return {
    pass: true,
    score: 0.7,
    reason: 'Response is neutral but acceptable'
  };
};
