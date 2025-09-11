# 💸 MoneyMate

> Your personal financial friend — a web app that helps students and young adults build better financial habits with AI-powered insights, budgeting, and visualised spending analysis.

![MoneyMate Screenshot](./assets/moneymate-logo.png)

---

## 🚀 Overview

**MoneyMate** is a financial management web application designed to make personal finance simple, approachable, and insightful.  
It enables users to track income and expenses, manage budgets, set saving goals, and receive **AI-generated insights** into their financial behaviour.  

Targeted at **students and young adults** starting their financial journey, MoneyMate focuses on education, habit-building, and friendly guidance — not overwhelming complexity.

---

## ✨ Features

- 🔐 **Secure Authentication** — Firebase-backed login with email, password, and Google sign-in.  
- 📊 **Transaction Management** — Add, edit, and view expenses/income with category tagging.  
- 💡 **AI-Powered Insights**  
  - Financial Health Score (Consistency, Diversity, Control).  
  - Anomaly detection with adjustable sensitivity.  
  - Spending pattern analysis (day-of-week, time-of-month).  
  - Predictive analytics with trend forecasting.  
  - Budget optimisation engine.  
- 🏦 **Budgets & Goals** — Allocate budgets, track progress, and receive smart adjustment suggestions.  
- 📈 **Visual Data** — Interactive charts and graphs powered by Recharts.  
- 🖥 **Responsive Dashboard** — Optimised for all devices, showing net worth, income vs. expenses, and quick insights.  
- 🎮 **Gamification** — Health scores and trend tracking encourage improvement over time.  

---

## 🛠 Tech Stack

![React](https://img.shields.io/badge/Frontend-React.js-blue?logo=react)  
![Tailwind](https://img.shields.io/badge/Styling-TailwindCSS-38b2ac?logo=tailwind-css)  
![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28?logo=firebase)  
![Recharts](https://img.shields.io/badge/Charts-Recharts-ff6384)  
![Lucide](https://img.shields.io/badge/Icons-Lucide%20React-lightgrey)

- **Frontend:** React.js (component-based UI, dynamic state management)  
- **Styling:** Tailwind CSS (utility-first design system)  
- **Backend:** Firebase + Firestore (authentication, real-time storage)  
- **Charts:** Recharts (visualising transactions, budgets, insights)  
- **Icons:** Lucide React (lightweight SVG library)  

---

## 📂 Project Structure

- /moneymate

- /public

- /src

- /components

- /dashboard # Main feature pages (Budget, Insights, Overview, Transactions, etc.)

- Header.js # App header & navigation

- ProtectedRoute.js # Route protection

- ResetPassword.js # Password reset

- /images # Logos & static assets

- App.js # Main app component

- firebase.js # Firebase config & setup

- index.js # Entry point

- Login.js # Login page

- package.json # Dependencies & scripts

- README.md

---

## 📸 Screenshots

| Overview Page |  |
|-------------|--|
| [![Overview Screenshot](./assets/overview.png)](./assets/overview.png) |

| Insights Page (1) | Insights Page (2) |
|-------------------|------------------|
| [![Insights Screenshot 1](./assets/insight1.png)](./assets/insight1.png) | [![Insights Screenshot 2](./assets/insight2.png)](./assets/insight2.png) |

| Sign Up Page | Transactions Page |
|--------------|-----------------|
| [![Sign Up Screenshot](./assets/signup.png)](./assets/signup.png) | [![Transactions Screenshot](./assets/transactions.png)](./assets/transactions.png) |

| Budget Page |  |
|-------------|--|
| [![Reminder Screenshot](./assets/reminder.png)](./assets/reminder.png) |  |

📚 Research & Design Decisions
Minimalist UI inspired by Apple’s design philosophy (Kreger, 2024).

Data visualisation guided by Heer et al. (2010), emphasising clarity over complexity.

Competitive analysis of UK apps (Emma, Monzo, Money Dashboard, Plum) shaped MoneyMate’s focus on simplicity + gamification.

🔮 Future Improvements
🌍 Multi-language support with live currency conversion.

📶 Offline mode with cloud sync.

🎨 Customisable user profiles & social sharing.

♿ Accessibility features (colourblind mode, screen reader support).

📱 Notifications & reminders for bills, budgets, and goals.

🏆 Trophy & achievement system.

🧪 Lessons Learned
Importance of planning & research before coding.

Building with React & Tailwind improved front-end efficiency.

Integrating Firebase simplified authentication and real-time storage.

Developing ML insights taught valuable lessons in data processing & scalability.

User experience (simplicity, clarity, gamification) is as critical as functionality.


## 👤 Author

**Jay Pusey**  
💼 Graduate Software Engineer | Passionate about **AI, Data-Driven Apps & UX Design**  

🔗 [LinkedIn](https://www.linkedin.com/in/jay-pusey-058003262/)  
🌐 [Portfolio](https://jaypusey1.github.io/Portfolio-Page/)

