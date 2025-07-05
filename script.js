document.addEventListener('DOMContentLoaded', () => {
  const topicButtonsDiv = document.getElementById('topic-buttons');
  const homeScreen = document.getElementById('home-screen');
  const quizScreen = document.getElementById('quiz-screen');
  const quizTitle = document.getElementById('quiz-title');
  const timerEl = document.getElementById('timer');
  const questionContainer = document.getElementById('question');
  const answerButtons = document.getElementById('answer-buttons');
  const prevButton = document.getElementById('prev-btn');
  const nextButton = document.getElementById('next-btn');
  const resultContainer = document.getElementById('result-container');
  const finalScoreEl = document.getElementById('final-score');
  const restartButton = document.getElementById('restart-btn');
  const reviewButton = document.getElementById('review-btn');
  const reviewContainer = document.getElementById('review-container');
  const reviewQuestionsDiv = document.getElementById('review-questions');
  const backHomeButton = document.getElementById('back-home-btn');
  const exportBtn = document.getElementById('export-btn');
  const historyTableBody = document.querySelector('#history-table tbody');
  const soundCorrect = document.getElementById('sound-correct');
  const soundWrong = document.getElementById('sound-wrong');

  let allTopics = ["html", "css", "javascript"];
  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let selectedAnswers = [];
  let timePerQuestion = [];
  let timerInterval = null;
  let questionStartTime = null;
  let countdownSeconds = 15;
  let countdown = countdownSeconds;
  let currentTopic = '';

  allTopics.forEach(topic => {
    const btn = document.createElement('button');
    btn.textContent = topic.toUpperCase();
    btn.addEventListener('click', () => loadTopic(topic));
    topicButtonsDiv.appendChild(btn);
  });

  restartButton.addEventListener('click', () => {
    homeScreen.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    reviewContainer.classList.add('hidden');
  });

  reviewButton.addEventListener('click', showReviewScreen);
  backHomeButton.addEventListener('click', () => {
    reviewContainer.classList.add('hidden');
    homeScreen.classList.remove('hidden');
  });

  prevButton.addEventListener('click', () => {
    saveTime();
    currentQuestionIndex--;
    showQuestion();
  });

  nextButton.addEventListener('click', () => {
    if (selectedAnswers[currentQuestionIndex] !== undefined) {
      saveTime();
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        showQuestion();
      } else {
        showResults();
      }
    } else {
      alert("Please select an answer before proceeding.");
    }
  });

  exportBtn.addEventListener('click', exportHistoryCSV);

  function loadTopic(topic) {
    fetch(`${topic}.json`)
      .then(res => res.json())
      .then(data => {
        currentTopic = topic;
        questions = shuffleArray(data);
        startQuiz();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load quiz data!");
      });
  }

  const clearHistoryBtn = document.getElementById('clear-history-btn');

clearHistoryBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to clear all quiz history?")) {
    localStorage.removeItem('quizHistory');
    loadHistory(); // Refresh the history table to show it's empty
    alert("Quiz history cleared!");
  }
});


  function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    selectedAnswers = [];
    timePerQuestion = [];
    homeScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    quizTitle.textContent = `${currentTopic.toUpperCase()} Quiz`;
    showQuestion();
  }

  function showQuestion() {
    resetState();

    const currentQuestion = questions[currentQuestionIndex];
    questionContainer.textContent = currentQuestion.question;

    currentQuestion.answers.forEach((answer, index) => {
      const li = document.createElement('li');
      li.textContent = answer.text;
      li.setAttribute('tabindex', 0);
      li.setAttribute('role', 'button');
      li.addEventListener('click', () => selectAnswer(li, index));
      answerButtons.appendChild(li);

      if (selectedAnswers[currentQuestionIndex] === index) {
        li.classList.add(answer.correct ? 'correct' : 'incorrect');
      }
    });

    prevButton.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    nextButton.textContent = currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish';

    startCountdown();
  }

  function resetState() {
    questionContainer.textContent = '';
    answerButtons.innerHTML = '';
    clearInterval(timerInterval);
    timerEl.textContent = '';
  }

  function selectAnswer(selectedLi, selectedIndex) {
    if (selectedAnswers[currentQuestionIndex] !== undefined) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.answers[selectedIndex].correct;

    selectedLi.classList.add(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      score++;
      soundCorrect.play();
    } else {
      soundWrong.play();
    }

    selectedAnswers[currentQuestionIndex] = selectedIndex;

    Array.from(answerButtons.children).forEach((btn, idx) => {
      btn.classList.add(
        currentQuestion.answers[idx].correct ? 'correct' : 'incorrect'
      );
      btn.style.pointerEvents = 'none';
    });

    stopCountdown();
  }

  function showResults() {
    quizScreen.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const totalTime = timePerQuestion.reduce((acc, t) => acc + t, 0);
    const avgTime = (totalTime / questions.length).toFixed(1);

    finalScoreEl.textContent = `You scored ${score} out of ${questions.length}.
      Avg time/question: ${avgTime}s.`;

    saveToLocalStorage(score, avgTime, currentTopic);
    loadHistory();
  }

  function startCountdown() {
    countdown = countdownSeconds;
    questionStartTime = Date.now();

    timerEl.textContent = `Time Left: ${countdown}s`;
    timerInterval = setInterval(() => {
      countdown--;
      timerEl.textContent = `Time Left: ${countdown}s`;

      if (countdown <= 0) {
        stopCountdown();
        handleTimeout();
      }
    }, 1000);
  }

  function stopCountdown() {
    clearInterval(timerInterval);
  }

  function saveTime() {
    if (questionStartTime) {
      const duration = (Date.now() - questionStartTime) / 1000;
      timePerQuestion[currentQuestionIndex] = duration;
    }
  }

  function handleTimeout() {
    timePerQuestion[currentQuestionIndex] = countdownSeconds;
    selectedAnswers[currentQuestionIndex] = -1;

    Array.from(answerButtons.children).forEach((btn, idx) => {
      btn.classList.add(
        questions[currentQuestionIndex].answers[idx].correct
          ? 'correct'
          : 'incorrect'
      );
      btn.style.pointerEvents = 'none';
    });

    score = Math.max(0, score - 1);
    soundWrong.play();
    alert("Time's up! 1 point deducted.");
  }

  function saveToLocalStorage(score, avgTime, topic) {
    let history = JSON.parse(localStorage.getItem('quizHistory')) || [];
    history.push({
      date: new Date().toLocaleString(),
      topic,
      score,
      avgTime
    });
    localStorage.setItem('quizHistory', JSON.stringify(history));
  }

  function loadHistory() {
    const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
    historyTableBody.innerHTML = '';

    history.reverse().forEach(record => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${record.date}</td>
        <td>${record.topic.toUpperCase()}</td>
        <td>${record.score}</td>
        <td>${record.avgTime}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  function showReviewScreen() {
    resultContainer.classList.add('hidden');
    reviewContainer.classList.remove('hidden');
    reviewQuestionsDiv.innerHTML = '';

    questions.forEach((q, index) => {
      const userAnswerIdx = selectedAnswers[index];
      const userAnswerText =
        userAnswerIdx >= 0 ? q.answers[userAnswerIdx].text : "No answer";
      const correctAnswer = q.answers.find(a => a.correct).text;
      const isCorrect =
        userAnswerIdx >= 0 && q.answers[userAnswerIdx]?.correct;

      const div = document.createElement('div');
      div.classList.add('review-item', isCorrect ? 'correct' : 'incorrect');

      div.innerHTML = `
        <strong>Q${index + 1}:</strong> ${q.question} <br>
        <strong>Your Answer:</strong> ${userAnswerText} <br>
        <strong>Correct Answer:</strong> ${correctAnswer}
      `;

      reviewQuestionsDiv.appendChild(div);
    });
  }

  function exportHistoryCSV() {
    const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
    if (history.length === 0) {
      alert("No quiz history to export.");
      return;
    }

    let csv = "Date,Topic,Score,Avg Time(s)\n";
    history.forEach(record => {
      csv += `"${record.date}","${record.topic.toUpperCase()}","${record.score}","${record.avgTime}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "quiz_history.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
  }
});
