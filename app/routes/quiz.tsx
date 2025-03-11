import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { getRandomQuestions } from "~/db.server";
import { useState, useEffect, useRef } from "react";
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

Chart.register(ArcElement, Tooltip, Legend);

export const loader = async () => {
  const questions = await getRandomQuestions(40);
  return json({ questions });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const answers = Object.fromEntries(formData.entries());
  const startTime = formData.get("startTime");
  const endTime = Date.now();
  const timeTaken = Math.round((endTime - parseInt(startTime)) / 1000);
  
  const questions = await getRandomQuestions(40);
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  
  const results = questions.map(q => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer ? parseInt(userAnswer) === q.correctAnswer : false;
    
    if (userAnswer === undefined) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }
    
    return {
      question: q.question,
      userAnswer: userAnswer !== undefined ? q.options[parseInt(userAnswer)] : "Not answered",
      correctAnswer: q.options[q.correctAnswer],
      isCorrect,
      isAnswered: userAnswer !== undefined
    };
  });

  return json({ 
    correctCount,
    incorrectCount,
    unansweredCount,
    total: questions.length,
    results,
    percentage: Math.round((correctCount / questions.length) * 100),
    timeTaken
  });
};

export default function Quiz() {
  const { questions } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [reviewQuestions, setReviewQuestions] = useState(new Set());
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const chartRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = (questionId: string) => {
    setAnsweredQuestions(prev => new Set(prev).add(questionId));
  };

  const toggleReview = (questionId: string) => {
    setReviewQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const