import { CareerTrack } from "./types";
import { MCQQuestion, SupportedLanguage } from "./types";

// --- Domain Assessment: mapped to Phase 1 Career Track --------------------------
// Starter set — expand per track over time. This is real, working content, not
// placeholder text, but it's a launch-ready seed rather than an exhaustive bank.
export const DOMAIN_QUESTIONS: Record<CareerTrack, MCQQuestion[]> = {
  ERP: [
    { id: "erp1", question: "In SAP, what does the module 'FICO' primarily handle?", options: ["Financial Accounting & Controlling", "Field Communication", "Factory Configuration", "Freight Coordination"], correctIndex: 0 },
    { id: "erp2", question: "What is the primary purpose of a 'chart of accounts' in an ERP system?", options: ["Track employee attendance", "Organize the general ledger structure", "Manage warehouse inventory", "Schedule production runs"], correctIndex: 1 },
    { id: "erp3", question: "In Workday, what is a 'Business Process'?", options: ["A financial report", "A configurable workflow for tasks like hiring or promotions", "A type of employee contract", "A security role"], correctIndex: 1 },
    { id: "erp4", question: "What does 'MRP' stand for in an ERP manufacturing context?", options: ["Material Requirements Planning", "Monthly Revenue Projection", "Manufacturing Resource Portal", "Master Record Protocol"], correctIndex: 0 },
    { id: "erp5", question: "Which of these is a common reason ERP implementations fail?", options: ["Too much user training", "Poor change management and data migration issues", "Using cloud infrastructure", "Too many go-live tests"], correctIndex: 1 },
  ],
  "Data & Analytics": [
    { id: "data1", question: "What does a LEFT JOIN return that an INNER JOIN does not?", options: ["Only matching rows", "All rows from the left table, matched or not", "Only rows from the right table", "Duplicate rows only"], correctIndex: 1 },
    { id: "data2", question: "What is the primary purpose of data normalization in a database?", options: ["Increase file size", "Reduce redundancy and improve data integrity", "Speed up all queries automatically", "Encrypt sensitive fields"], correctIndex: 1 },
    { id: "data3", question: "In a dashboard, what does a 'north star metric' represent?", options: ["The most complex chart", "The single metric that best reflects core value delivered", "A metric only executives can see", "The metric updated most frequently"], correctIndex: 1 },
    { id: "data4", question: "What is 'p-value' used for in statistical testing?", options: ["Measuring correlation strength", "Estimating the probability the observed result occurred by chance", "Counting data points", "Normalizing outliers"], correctIndex: 1 },
    { id: "data5", question: "Which of these best describes a 'data warehouse'?", options: ["A physical server room", "A centralized repository optimized for analysis and reporting", "A tool for real-time transaction processing only", "A backup system for emails"], correctIndex: 1 },
  ],
  "AI / ML": [
    { id: "ai1", question: "What is 'overfitting' in machine learning?", options: ["A model that performs well on new, unseen data", "A model that memorizes training data but generalizes poorly", "A model with too few parameters", "A dataset that is too large"], correctIndex: 1 },
    { id: "ai2", question: "What does 'supervised learning' require?", options: ["No data at all", "Labeled training data with known outcomes", "Only unlabeled data", "Real-time human feedback during inference"], correctIndex: 1 },
    { id: "ai3", question: "What is the purpose of a validation set?", options: ["To train the final model", "To tune hyperparameters without touching the test set", "To store raw data", "To visualize the model architecture"], correctIndex: 1 },
    { id: "ai4", question: "What does 'embedding' mean in the context of NLP models?", options: ["Compressing an image", "A dense vector representation of text capturing semantic meaning", "A type of database index", "A hardware acceleration technique"], correctIndex: 1 },
    { id: "ai5", question: "What is a common cause of bias in a machine learning model?", options: ["Using too much compute", "Training data that doesn't represent the real-world population", "Using Python instead of R", "Too many validation checks"], correctIndex: 1 },
  ],
  "Cloud / DevOps": [
    { id: "cloud1", question: "What is the main benefit of Infrastructure as Code (IaC)?", options: ["Manual server configuration", "Reproducible, version-controlled infrastructure", "Slower deployments", "Reduced need for testing"], correctIndex: 1 },
    { id: "cloud2", question: "What does a Kubernetes 'pod' represent?", options: ["A physical server", "The smallest deployable unit, typically one or more containers", "A network firewall rule", "A billing account"], correctIndex: 1 },
    { id: "cloud3", question: "What is the purpose of a CI/CD pipeline?", options: ["Manually testing code once a year", "Automating build, test, and deployment processes", "Storing customer data", "Managing employee access badges"], correctIndex: 1 },
    { id: "cloud4", question: "What does 'auto-scaling' in cloud infrastructure do?", options: ["Automatically deletes unused code", "Adjusts compute resources based on demand", "Encrypts data at rest", "Schedules employee shifts"], correctIndex: 1 },
    { id: "cloud5", question: "What is a key difference between a container and a virtual machine?", options: ["Containers include a full OS kernel", "Containers share the host OS kernel, making them lighter weight", "VMs are always faster", "There is no meaningful difference"], correctIndex: 1 },
  ],
  "Semiconductor & Embedded": [
    { id: "semi1", question: "What does RTOS stand for?", options: ["Real-Time Operating System", "Remote Terminal Output Service", "Register Transfer Output Standard", "Rapid Test Output Sequence"], correctIndex: 0 },
    { id: "semi2", question: "In VLSI design, what does 'tape-out' refer to?", options: ["Removing a chip from production", "The final design being sent for fabrication", "A testing failure", "Packaging the chip"], correctIndex: 1 },
    { id: "semi3", question: "What is the primary purpose of a bootloader in an embedded system?", options: ["Manage user interfaces", "Initialize hardware and load the main firmware/OS", "Handle network requests", "Store application logs"], correctIndex: 1 },
    { id: "semi4", question: "What does 'interrupt latency' measure in embedded systems?", options: ["Time to boot the device", "Time between an interrupt signal and the start of its handler", "Battery drain rate", "Clock speed of the CPU"], correctIndex: 1 },
    { id: "semi5", question: "What is the main advantage of using an FPGA over a fixed ASIC?", options: ["Lower unit cost at high volume", "Reconfigurability after manufacturing", "Always lower power consumption", "No need for design verification"], correctIndex: 1 },
  ],
  "Life Sciences & Pharma": [
    { id: "life1", question: "What does GCP stand for in clinical research?", options: ["Global Clinical Protocol", "Good Clinical Practice", "General Compliance Policy", "Government Certified Pharmacist"], correctIndex: 1 },
    { id: "life2", question: "What is the primary purpose of a Phase III clinical trial?", options: ["Test basic safety in a small group", "Confirm efficacy and monitor side effects in a large population", "Initial lab testing", "Post-market surveillance only"], correctIndex: 1 },
    { id: "life3", question: "What does 'pharmacovigilance' refer to?", options: ["Drug pricing strategy", "Monitoring the safety of medicines after they reach the market", "Manufacturing quality control only", "Patent protection"], correctIndex: 1 },
    { id: "life4", question: "What is an Investigational New Drug (IND) application used for?", options: ["Marketing an approved drug", "Requesting FDA authorization to begin human clinical trials", "Renewing a patent", "Setting drug pricing"], correctIndex: 1 },
    { id: "life5", question: "What does 'informed consent' ensure in a clinical trial?", options: ["The sponsor's legal protection only", "Participants understand risks/benefits before agreeing to take part", "Faster trial recruitment", "Lower trial costs"], correctIndex: 1 },
  ],
  "Other Technology": [
    { id: "gen1", question: "What is the primary purpose of version control systems like Git?", options: ["Compress files", "Track changes to code over time and enable collaboration", "Run automated tests only", "Host websites"], correctIndex: 1 },
    { id: "gen2", question: "What does an API primarily enable?", options: ["Direct database access for all users", "Structured communication between different software systems", "Physical hardware assembly", "User interface styling"], correctIndex: 1 },
    { id: "gen3", question: "What is the main goal of Agile methodology?", options: ["Deliver one big release at the end of a year-long project", "Deliver work in small, iterative increments with regular feedback", "Eliminate all documentation", "Avoid working with stakeholders"], correctIndex: 1 },
    { id: "gen4", question: "What is technical debt?", options: ["Money owed to a software vendor", "The implied cost of rework from choosing a quick, easy solution now", "A type of database", "A hardware failure"], correctIndex: 1 },
    { id: "gen5", question: "What does 'scalability' mean for a software system?", options: ["It only runs on one machine", "Its ability to handle growth in users or data without major redesign", "It has a colorful user interface", "It is written in a specific language"], correctIndex: 1 },
  ],
};

// --- Behavioural Assessment: trait-mapped, outputs a profile not a pass/fail ----
export const BEHAVIOURAL_QUESTIONS: MCQQuestion[] = [
  { id: "b1", trait: "Leadership", question: "When a project stalls, you're most likely to:", options: ["Wait for someone else to take charge", "Step in and redirect the team's focus", "Escalate immediately to a manager", "Quietly work around the blocker alone"], correctIndex: 1 },
  { id: "b2", trait: "Collaboration", question: "In a group disagreement, you tend to:", options: ["Push for your own view strongly", "Find common ground across perspectives", "Avoid the conversation", "Let the most senior person decide"], correctIndex: 1 },
  { id: "b3", trait: "Structure", question: "You prefer work that is:", options: ["Highly structured with clear processes", "Loosely defined, figuring it out as you go", "A mix, depending on the task", "Entirely self-directed with no check-ins"], correctIndex: 0 },
  { id: "b4", trait: "Adaptability", question: "When priorities suddenly change, you:", options: ["Get frustrated by the disruption", "Adjust quickly and refocus", "Stick to the original plan regardless", "Need significant time to reorient"], correctIndex: 1 },
  { id: "b5", trait: "Leadership", question: "You're more energized by:", options: ["Executing a clear plan set by someone else", "Setting direction and mentoring others", "Working entirely solo", "Following detailed instructions"], correctIndex: 1 },
  { id: "b6", trait: "Collaboration", question: "Giving feedback to a peer, you:", options: ["Avoid it to keep the peace", "Give it directly and constructively", "Only give positive feedback", "Wait for them to ask"], correctIndex: 1 },
];

export function behaviouralProfile(answers: number[]): { trait: string; score: number }[] {
  const traitScores: Record<string, { hits: number; total: number }> = {};
  BEHAVIOURAL_QUESTIONS.forEach((q, i) => {
    const trait = q.trait ?? "General";
    traitScores[trait] = traitScores[trait] ?? { hits: 0, total: 0 };
    traitScores[trait].total++;
    if (answers[i] === q.correctIndex) traitScores[trait].hits++;
  });
  return Object.entries(traitScores).map(([trait, { hits, total }]) => ({
    trait,
    score: Math.round((hits / total) * 100),
  }));
}

// --- Language Assessment: written MCQ + spoken prompt ---------------------------
export const LANGUAGE_QUESTIONS: Record<SupportedLanguage, MCQQuestion[]> = {
  English: [
    { id: "en1", question: "Choose the correct sentence:", options: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She not like coffee."], correctIndex: 2 },
    { id: "en2", question: "What is a synonym for 'meticulous'?", options: ["Careless", "Thorough", "Fast", "Loud"], correctIndex: 1 },
    { id: "en3", question: "Complete: 'By the time we arrived, the meeting ___ already started.'", options: ["has", "had", "was", "is"], correctIndex: 1 },
    { id: "en4", question: "Which word best fits: 'The report was ___ concise and comprehensive.'", options: ["both", "either", "neither", "so"], correctIndex: 0 },
    { id: "en5", question: "Identify the correctly punctuated sentence:", options: ["Its important to review the data, before submitting.", "It's important to review the data before submitting.", "Its important, to review the data before submitting.", "It is important to review the data before, submitting."], correctIndex: 1 },
  ],
  German: [
    { id: "de1", question: "'Ich ___ nach Berlin.' (fahren, present tense, ich)", options: ["fahrt", "fahre", "fahren", "fährst"], correctIndex: 1 },
    { id: "de2", question: "What is the correct article for 'Tisch' (table)?", options: ["die", "das", "der", "den"], correctIndex: 2 },
    { id: "de3", question: "'Können Sie mir helfen?' means:", options: ["Can you help me?", "Where are you from?", "What time is it?", "I don't understand."], correctIndex: 0 },
    { id: "de4", question: "Choose the correct past tense: 'Ich ___ gestern im Büro.'", options: ["bin", "war", "hatte", "werde"], correctIndex: 1 },
  ],
  Arabic: [
    { id: "ar1", question: "'مرحبا' means:", options: ["Goodbye", "Hello", "Thank you", "Please"], correctIndex: 1 },
    { id: "ar2", question: "What does 'كيف حالك؟' ask?", options: ["What is your name?", "Where do you live?", "How are you?", "What time is it?"], correctIndex: 2 },
    { id: "ar3", question: "'شكرا' means:", options: ["Sorry", "Thank you", "Yes", "No"], correctIndex: 1 },
    { id: "ar4", question: "Arabic script is written:", options: ["Left to right", "Right to left", "Top to bottom", "Bottom to top"], correctIndex: 1 },
  ],
  Hindi: [
    { id: "hi1", question: "'धन्यवाद' means:", options: ["Hello", "Thank you", "Goodbye", "Sorry"], correctIndex: 1 },
    { id: "hi2", question: "'आप कैसे हैं?' means:", options: ["What is your name?", "How are you?", "Where are you going?", "What time is it?"], correctIndex: 1 },
    { id: "hi3", question: "Which script is Hindi written in?", options: ["Latin", "Devanagari", "Cyrillic", "Arabic"], correctIndex: 1 },
    { id: "hi4", question: "'कृपया' means:", options: ["Please", "Never", "Always", "Maybe"], correctIndex: 0 },
  ],
  French: [
    { id: "fr1", question: "'Je ___ étudiant.' (être, present, je)", options: ["es", "suis", "est", "sommes"], correctIndex: 1 },
    { id: "fr2", question: "What does 'Merci beaucoup' mean?", options: ["Good morning", "Thank you very much", "See you later", "Excuse me"], correctIndex: 1 },
    { id: "fr3", question: "Choose the correct article: '___ table' (feminine)", options: ["le", "la", "les", "l'"], correctIndex: 1 },
    { id: "fr4", question: "'Où est la gare?' means:", options: ["What time is it?", "Where is the station?", "How much does it cost?", "What is your name?"], correctIndex: 1 },
  ],
  Spanish: [
    { id: "es1", question: "'Yo ___ de España.' (ser, present, yo)", options: ["es", "soy", "eres", "son"], correctIndex: 1 },
    { id: "es2", question: "What does '¿Cómo estás?' mean?", options: ["What is your name?", "How are you?", "Where do you live?", "What time is it?"], correctIndex: 1 },
    { id: "es3", question: "Choose the correct article: '___ mesa' (feminine)", options: ["el", "la", "los", "las"], correctIndex: 1 },
    { id: "es4", question: "'Gracias' means:", options: ["Please", "Sorry", "Thank you", "Goodbye"], correctIndex: 2 },
  ],
};

export const LANGUAGE_SPOKEN_PROMPTS: Record<SupportedLanguage, string> = {
  English: "Describe your ideal work environment and why it helps you do your best work.",
  German: "Beschreiben Sie Ihre bisherige Berufserfahrung in ein bis zwei Sätzen.",
  Arabic: "صف بإيجاز خبرتك المهنية في جملة أو جملتين.",
  Hindi: "अपने कार्य अनुभव के बारे में एक या दो वाक्यों में बताएं।",
  French: "Décrivez votre expérience professionnelle en une ou deux phrases.",
  Spanish: "Describe tu experiencia profesional en una o dos frases.",
};

// Deterministic MCQ score → combined with AI spoken score → CEFR tier mapping.
export function scoreMCQ(questions: MCQQuestion[], answers: number[]): number {
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  return Math.round((correct / questions.length) * 100);
}

export function toCEFRTier(combinedScore: number): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (combinedScore >= 95) return "C2";
  if (combinedScore >= 85) return "C1";
  if (combinedScore >= 70) return "B2";
  if (combinedScore >= 55) return "B1";
  if (combinedScore >= 35) return "A2";
  return "A1";
}
