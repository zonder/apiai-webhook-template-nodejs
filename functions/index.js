// Copyright 2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

process.env.DEBUG = 'actions-on-google:*';
const functions = require('firebase-functions');
const App = require('actions-on-google').ApiAiApp;

const CONGRATULATIONS_ANSWER = "Congrats!";
const WRONG_ANSWER = "Sorry, it's wrong answer. Try again later.";

const ALL_QUESTIONS = ["Q1", "Q2", "Q3"];
const ALL_ANSWERS = ["Q1", "Q2", "Q3"];

const ASK_CONTEXT = "ask";

const ANSWERED_QUESTIONS = "answered_questions";
const CURRENT_QUESTION = "current_question";
const ANSWERS = "answers";

const ANSWER_ARGUMENT = "answer";

const DEFAULT_TIMEOUT = 10;
const FINISHED_FLAG = "finished";

exports.yourAction = functions.https.onRequest((request, response) => {
  const app = new App({ request, response });

  console.log('Request headers: ' + JSON.stringify(request.headers));
  console.log('Request body: ' + JSON.stringify(request.body));

  function handleAsk(app, incrementQuestion) {

    let params = getParameters(app, ASK_CONTEXT);

    let currentQuestion = params[CURRENT_QUESTION];
    if (currentQuestion == null)
      currentQuestion = 0;
    else if(incrementQuestion)
      currentQuestion = currentQuestion + 1;

    params[CURRENT_QUESTION] = currentQuestion;
    app.setContext(ASK_CONTEXT, DEFAULT_TIMEOUT, params);

    if (currentQuestion >= ALL_QUESTIONS.length) {
      app.setContext(ASK_CONTEXT, 0);
      app.tell(CONGRATULATIONS_ANSWER);
      return;
    }
    let questionText = ALL_QUESTIONS[currentQuestion];
    app.ask(questionText);
  }

  function handleAnswer(app) {
    let askContext = app.getContext(ASK_CONTEXT);
    if(askContext == null)
    {
      handleAsk(app);
      return;
    }

    let answer = app.getArgument(ANSWER_ARGUMENT);
    if (answer == null) {
      answer = app.getRawInput();
    }

    let askParameters = getParameters(app, ASK_CONTEXT);
    let correctAnswer = ALL_ANSWERS[askParameters[CURRENT_QUESTION]];

    if (answer != correctAnswer) {
      app.setContext(ASK_CONTEXT, 0);
      app.tell(WRONG_ANSWER);
      return;
    }

    handleAsk(app, true);
  }

  function handleUnknown(app) {

    let askContext = app.getContext(ASK_CONTEXT);
    if(askContext != null)
    {
      handleAnswer(app);
      return;
    }
    app.tell("I missed what you said. Say it again?");
    
  }

  function getParameters(app, contextName) {
    let context = app.getContext(contextName);
    let params = {};
    if (context && context.parameters)
      params = context.parameters;

    return params;
  }

  const actionMap = new Map();
  actionMap.set('question.ask', handleAnswer);
  actionMap.set('input.unknown', handleUnknown);

  app.handleRequest(actionMap);
});
// [END YourAction]