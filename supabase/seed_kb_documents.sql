delete from public.kb_documents
where source in ('Internal', 'VitaScan educational KB');

insert into public.kb_documents (
  title,
  source,
  content,
  tags,
  emergency_red_flags,
  last_reviewed
)
values
  (
    'Chest pain triage basics',
    'Internal',
    'Chest pain can come from many causes, including muscle strain, reflux, anxiety, lung irritation, or heart-related problems. Educational triage should focus on severity, onset, associated symptoms, risk factors, and whether symptoms are new or worsening. Chest pain should not be diagnosed from a symptom checklist alone. A licensed clinician should evaluate persistent, concerning, or unexplained chest pain.',
    array['chest pain', 'cardiac', 'triage'],
    array['severe or crushing chest pain', 'chest pain with shortness of breath', 'pain spreading to arm jaw back or shoulder', 'chest pain with fainting sweating nausea or confusion'],
    '2026-05-20'
  ),
  (
    'Shortness of breath warning signs',
    'Internal',
    'Shortness of breath may occur with respiratory infections, asthma-like symptoms, anxiety, heart or lung conditions, allergic reactions, or other causes. Educational guidance should ask about sudden onset, severity, ability to speak, chest pain, wheezing, fever, blue lips, confusion, fainting, and whether symptoms are worsening. Severe or sudden breathing trouble needs urgent attention.',
    array['shortness of breath', 'breathing', 'respiratory', 'triage'],
    array['severe breathing trouble', 'blue lips', 'confusion or fainting', 'shortness of breath with chest pain', 'unable to speak full sentences'],
    '2026-05-20'
  ),
  (
    'Fever escalation basics',
    'Internal',
    'Fever is commonly related to infection or inflammation. Educational guidance should consider duration, temperature trend, hydration, exposures, immune status, rash, neck stiffness, confusion, breathing trouble, and severe weakness. Users should seek medical care for persistent fever, worsening symptoms, dehydration, or symptoms that feel severe or unusual.',
    array['fever', 'infection', 'triage'],
    array['fever with stiff neck', 'fever with confusion', 'fever with trouble breathing', 'signs of dehydration', 'non-blanching rash'],
    '2026-05-20'
  ),
  (
    'Headache warning signs',
    'Internal',
    'Headaches can be related to tension, dehydration, migraine-like patterns, illness, sleep disruption, stress, or other causes. Educational triage should ask whether this is sudden, severe, new, different, associated with neurologic symptoms, fever, stiff neck, vision changes, injury, pregnancy, or immune suppression. A sudden worst headache or headache with neurologic changes should be treated as urgent.',
    array['headache', 'neurologic', 'triage'],
    array['sudden worst headache', 'headache with weakness numbness or speech trouble', 'headache with fever and stiff neck', 'headache after head injury', 'new severe headache during pregnancy'],
    '2026-05-20'
  ),
  (
    'Abdominal pain triage basics',
    'Internal',
    'Abdominal pain may come from digestion, infection, inflammation, urinary symptoms, reproductive organs, or other causes. Educational guidance should consider location, suddenness, severity, vomiting, fever, stool changes, pregnancy possibility, urinary symptoms, trauma, and whether the abdomen is rigid or very tender. Severe, worsening, or localized pain should be evaluated promptly.',
    array['abdominal pain', 'stomach pain', 'triage'],
    array['severe sudden abdominal pain', 'rigid abdomen', 'abdominal pain with fainting', 'black or bloody stool', 'persistent vomiting', 'abdominal pain during pregnancy'],
    '2026-05-20'
  ),
  (
    'Dizziness and fainting triage',
    'Internal',
    'Dizziness can be related to dehydration, inner ear problems, low blood pressure, infection, medication effects, anxiety, heart rhythm problems, or neurologic issues. Educational triage should ask about fainting, chest pain, shortness of breath, weakness, numbness, trouble speaking, severe headache, persistent vomiting, and recent injury.',
    array['dizziness', 'fainting', 'neurologic', 'triage'],
    array['dizziness with chest pain', 'dizziness with weakness numbness or speech trouble', 'fainting with injury', 'dizziness with severe headache', 'persistent vomiting'],
    '2026-05-20'
  ),
  (
    'Vomiting and diarrhea dehydration risk',
    'Internal',
    'Vomiting and diarrhea are often related to infections, food intolerance, medication effects, or other digestive conditions. Educational guidance should focus on hydration, duration, frequency, abdominal pain, fever, blood in vomit or stool, dizziness, ability to keep fluids down, and high-risk groups. Persistent symptoms or dehydration signs need medical attention.',
    array['vomiting', 'diarrhea', 'dehydration', 'triage'],
    array['blood in vomit or stool', 'severe abdominal pain', 'signs of dehydration', 'confusion or fainting', 'inability to keep fluids down'],
    '2026-05-20'
  ),
  (
    'Allergic reaction safety',
    'Internal',
    'Allergic reactions can range from mild itching or rash to life-threatening anaphylaxis. Educational guidance should ask about breathing, throat tightness, tongue or lip swelling, wheezing, faintness, vomiting, widespread hives, and known severe allergen exposure. Severe allergic symptoms require emergency care.',
    array['allergic reaction', 'anaphylaxis', 'rash', 'triage'],
    array['trouble breathing', 'throat tongue or lip swelling', 'wheezing', 'fainting or confusion', 'widespread hives with vomiting'],
    '2026-05-20'
  ),
  (
    'Dehydration signs',
    'Internal',
    'Dehydration can happen with vomiting, diarrhea, fever, sweating, heat exposure, or poor intake. Educational triage should ask about urination, thirst, dry mouth, dizziness, fainting, confusion, rapid heartbeat, weakness, and ability to drink fluids. Moderate or worsening dehydration should be evaluated.',
    array['dehydration', 'fluids', 'triage'],
    array['very little urination', 'confusion', 'fainting', 'rapid heartbeat with weakness', 'unable to keep fluids down'],
    '2026-05-20'
  ),
  (
    'Anxiety and panic-like symptoms',
    'Internal',
    'Anxiety or panic can cause symptoms such as racing heart, chest tightness, shortness of breath, trembling, sweating, dizziness, nausea, or a sense of danger. These symptoms can overlap with medical emergencies, so educational guidance should not assume anxiety when symptoms are new, severe, or include red flags. Encourage medical evaluation when symptoms are persistent, worsening, or uncertain.',
    array['anxiety', 'panic', 'chest tightness', 'triage'],
    array['chest pain with shortness of breath', 'fainting', 'new severe symptoms', 'weakness numbness or speech trouble', 'thoughts of self-harm'],
    '2026-05-20'
  ),
  (
    'Back pain triage basics',
    'Internal',
    'Back pain is often related to muscle strain, posture, activity, or irritation, but can also reflect nerve, kidney, infection, injury, or other problems. Educational guidance should ask about trauma, fever, weakness, numbness, bladder or bowel changes, pain radiating down the leg, cancer history, immune suppression, and worsening or severe pain.',
    array['back pain', 'musculoskeletal', 'triage'],
    array['back pain after major trauma', 'new weakness or numbness', 'loss of bladder or bowel control', 'fever with back pain', 'severe worsening pain'],
    '2026-05-20'
  ),
  (
    'Urinary symptoms triage',
    'Internal',
    'Urinary symptoms may include burning, urgency, frequency, pelvic discomfort, flank pain, blood in urine, fever, or changes in urine amount. Educational guidance should consider pregnancy, fever, back or side pain, vomiting, confusion, severe pain, and whether the person is very young, older, immunocompromised, or has kidney problems.',
    array['urinary symptoms', 'urination', 'kidney', 'triage'],
    array['fever with flank pain', 'blood in urine with severe pain', 'confusion', 'vomiting with urinary symptoms', 'urinary symptoms during pregnancy'],
    '2026-05-20'
  ),
  (
    'Rash triage basics',
    'Internal',
    'Rashes can be caused by irritation, allergy, infection, heat, medication reactions, or other conditions. Educational guidance should ask about fever, pain, spreading, blisters, purple spots, facial swelling, breathing trouble, new medications, mucous membrane involvement, and whether the rash follows a known exposure.',
    array['rash', 'skin', 'allergy', 'triage'],
    array['rash with trouble breathing', 'rash with facial or throat swelling', 'purple non-blanching rash', 'rash with fever and severe illness', 'skin peeling or mouth eye involvement'],
    '2026-05-20'
  ),
  (
    'Sore throat and cough triage',
    'Internal',
    'Sore throat and cough are commonly related to viral infections, allergies, irritation, or other respiratory causes. Educational guidance should ask about breathing trouble, chest pain, high or persistent fever, dehydration, difficulty swallowing, drooling, severe weakness, coughing blood, and symptoms that are worsening or prolonged.',
    array['sore throat', 'cough', 'respiratory', 'triage'],
    array['trouble breathing', 'chest pain', 'coughing blood', 'drooling or inability to swallow', 'severe weakness or dehydration'],
    '2026-05-20'
  ),
  (
    'Fatigue triage basics',
    'Internal',
    'Fatigue can be related to sleep, stress, infection, nutrition, chronic conditions, mood, medications, or many other causes. Educational triage should ask about sudden onset, severity, fever, weight loss, chest pain, breathing trouble, fainting, weakness, bleeding, pregnancy, mood concerns, and whether daily activities are affected.',
    array['fatigue', 'weakness', 'triage'],
    array['fatigue with chest pain', 'fatigue with shortness of breath', 'fainting', 'new one-sided weakness', 'thoughts of self-harm', 'severe or rapidly worsening weakness'],
    '2026-05-20'
  ),
  (
    'General emergency red flags',
    'Internal',
    'Emergency care is appropriate for symptoms that are severe, sudden, rapidly worsening, or potentially life-threatening. Examples include concerning chest pain, severe breathing trouble, stroke-like symptoms, severe allergic reaction, severe bleeding, fainting with injury, sudden severe pain, confusion, or symptoms after major trauma.',
    array['emergency', 'red flags', 'triage'],
    array['severe chest pain', 'severe breathing trouble', 'stroke-like symptoms', 'severe allergic reaction', 'severe bleeding', 'confusion', 'major trauma'],
    '2026-05-20'
  ),
  (
    'Preparing for medical care',
    'Internal',
    'Before a medical visit, users can write down when symptoms started, where they are located, severity, changes over time, related symptoms, exposures, medical conditions, allergies, medications, and questions. This information can help clinicians evaluate symptoms more efficiently. This preparation is educational and does not replace clinical evaluation.',
    array['doctor visit', 'preparation', 'education'],
    array[]::text[],
    '2026-05-20'
  );
