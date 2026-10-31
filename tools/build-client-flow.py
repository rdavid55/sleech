"""Build customer workflow pages using the current GitHub site's shared shell.
Run from repository root. Does not modify unrelated calculators or 3D modules.
"""
from pathlib import Path
import json, re
ROOT=Path(__file__).resolve().parent.parent
DOCS=ROOT/'docs'
RELEASE='20261031-workflow2'

def page(name,title,body,en=False,scripts=()):
    base=DOCS/('en' if en else '')
    shell=(base/'index.html').read_text()
    shell=re.sub(r'<title>.*?</title>',f'<title>{title} · '+('SLEECH' if en else 'СЛИЧ')+'</title>',shell,count=1)
    shell=re.sub(r'<link rel="alternate"[^>]+>','',shell)
    shell=re.sub(r'(<body data-page=")[^"]+',r'\g<1>'+name.removesuffix('.html'),shell,count=1)
    prefix='../' if en else ''
    if 'assets/intake.css' not in shell:
        shell=shell.replace('</head>',f'<link rel="stylesheet" href="{prefix}assets/intake.css?v={RELEASE}"></head>')
    shell=re.sub(r'<main\b.*?</main>',f'<main id="main" tabindex="-1" class="workflow-main">{body}</main>',shell,flags=re.S,count=1)
    shell=re.sub(r'(<a id="language-switch"[^>]*href=")[^"]*',r'\g<1>'+('../'+name if en else 'en/'+name),shell,count=1)
    shell=shell.replace('</body>',''.join(f'<script src="{prefix}assets/{s}?v={RELEASE}" defer></script>' for s in scripts)+'</body>')
    (base/name).write_text(shell)

def heading(kicker,title,text):
    return f'<div class="page-heading container"><p class="eyebrow">{kicker}</p><h1>{title}</h1><p class="lede">{text}</p></div>'

for en in (False,True):
    def t(ru,eng): return eng if en else ru
    fields=[
      ('role',t('Кем Вы выступаете?','Your role'), [('customer',t('Заказчик продукции','Product customer')),('supplier',t('Поставщик','Supplier')),('laboratory',t('Лаборатория / ОТК','Laboratory / quality team')),('unknown',t('Не знаю','Not sure'))]),
      ('stage',t('Что произошло?','What happened?'), [('conflict',t('Результаты различаются','Results disagree')),('prevent',t('Подготовка до поставки','Before delivery')),('unknown',t('Пока нужно разобраться','Need help understanding the task'))]),
      ('category',t('Какие показатели контролируете?','Which characteristics are checked?'), [('geometry',t('Размеры и форма','Dimensions / shape')),('physical',t('Физические свойства','Physical properties')),('chemical',t('Химические показатели','Chemical characteristics')),('other',t('Другая группа','Other')),('unknown',t('Не знаю','Not sure'))]),
      ('evidence',t('Какие исходные результаты есть?','Available measurement results'), [('two',t('Результаты обеих сторон','Results from both parties')),('one',t('Результаты одной стороны','Results from one party')),('none',t('Данных пока нет','No results yet')),('unknown',t('Не знаю','Not sure'))])]
    selects=''.join(f'<label>{label}<select name="{key}" required><option value="">{t("Выберите вариант","Choose an option")}</option>'+''.join(f'<option value="{v}">{label}</option>' for v,label in opts)+'</select></label>' for key,label,opts in fields)
    checks=[('method',t('Согласовать метод и условия','Align method and conditions')),('uncertainty',t('Учесть неопределённость результатов','Consider measurement uncertainty')),('traceability',t('Проверить сведения о прослеживаемости','Review traceability information')),('protocol',t('Подготовить общий протокол','Prepare a shared protocol')),('confidentiality',t('Отдельно согласовать конфиденциальность','Agree confidentiality separately'))]
    form=f'''<div class="workflow-grid"><section class="workflow-card"><span class="workflow-kicker">{t('Четыре вопроса → подходящий следующий шаг','Four questions → a relevant next step')}</span><form id="intake-form" class="workflow-form"><label>{t('Опишите ситуацию своими словами','Describe your situation')}<textarea name="description" rows="4" maxlength="4000" placeholder="{t('Что контролируете, в чём затруднение и какой результат нужен?','What is being checked, what is difficult and what outcome do you need?')}"></textarea></label><div><button id="intake-suggest" class="secondary" type="button">{t('Проверить описание','Review the description')}</button><p id="intake-suggestion" class="workflow-note" role="status"></p></div><div class="workflow-subgrid">{selects}</div><fieldset class="workflow-checks"><legend>{t('Что нужно учесть? Необязательно','What should be considered? Optional')}</legend>'''+''.join(f'<label class="workflow-check"><input type="checkbox" name="requirements" value="{key}">{label}</label>' for key,label in checks)+f'''</fieldset><details><summary>{t('Добавить сведения о задаче','Add task details')}</summary><div class="workflow-form"><label>{t('Продукция / объект контроля','Product / inspection object')}<input name="object" maxlength="4000"></label><label>{t('Измеряемая характеристика','Measurand / characteristic')}<input name="characteristic" maxlength="4000"></label><label>{t('Требования, стандарты и доступные документы','Requirements, standards and available documents')}<textarea name="documents" maxlength="4000"></textarea></label><label>{t('Желаемый срок','Requested deadline')}<input name="deadline" maxlength="4000"></label></div></details><div class="workflow-actions"><button class="primary" type="submit">{t('Подобрать следующий шаг','Find the next step')}</button><button id="intake-download" class="secondary" type="button">{t('Скачать описание','Download the brief')}</button></div></form><p id="intake-saved" class="workflow-note" role="status">{t('Подбор без регистрации. Данные ещё не отправлены.','No registration needed. Nothing has been submitted.')}</p><button id="intake-clear" class="workflow-link" type="button">{t('Очистить черновик','Clear the draft')}</button></section><aside class="workflow-card workflow-result"><div id="intake-result" hidden><span class="workflow-kicker">{t('Предварительный подбор','Preliminary recommendation')}</span><h2 id="intake-result-title" tabindex="-1"></h2><p id="intake-reason"></p><p id="intake-price" class="workflow-price"></p><h3>{t('Что получите','Deliverable')}</h3><p id="intake-output"></p><p id="intake-limit" class="workflow-note"></p><button id="intake-next" type="button" class="primary">{t('Продолжить в кабинете','Continue to portal (RU)')}</button><hr class="workflow-divider"></div><h3>{t('Проверяем применимость','Check applicability')}</h3><p>{t('СЛИЧ помогает согласовывать результаты контроля между поставщиком и заказчиком. Первый проверяемый сценарий — геометрические измерения; другие показатели требуют предварительной оценки специалистом.','SLEECH helps suppliers and customers align inspection results. The first validation scenario is geometric measurement; other characteristics need a specialist review.')}</p><p class="workflow-note">{t('Текст помогает описать задачу, но не заменяет явные ответы и экспертную оценку. Система не подтверждает годность продукции и не гарантирует устранение любого расхождения.','Free text helps describe the task; it does not replace explicit answers or expert review. The system does not decide product conformity or guarantee resolution of every disagreement.')}</p><a class="text-link" href="solution.html">{t('Что предлагает СЛИЧ ↗','What SLEECH offers ↗')}</a></aside></div>'''
    page('start.html',t('Подбор решения','Find a service'),heading(t('СЛИЧ / ВАША ЗАДАЧА','SLEECH / YOUR TASK'),t('Начнём с Вашей ситуации.','Start with your situation.'),t('Расскажите, что мешает согласовать результаты контроля. Получите понятный следующий шаг, состав результата и условия работы.','Tell us what prevents agreement on inspection results. Get a clear next step, deliverables and service boundaries.'))+'<section class="section"><div class="container workflow-wrap">'+form+'</div></section>',en,('intake-core.js','intake.js'))
    if en:
      portal=heading('SLEECH / CLIENT PORTAL','Requests and coordination','The pilot portal is currently available in Russian.')+'<section class="section"><div class="container"><div class="workflow-card"><p>Customer and team workspaces use the same secure server, with access checked for each organisation. Opening this page does not submit a request.</p><a class="primary" href="../portal.html?draft=1" lang="ru">Continue to the Russian portal</a></div></div></section>'
      page('portal.html','Client portal',portal,True)
    else:
      portal=heading('СЛИЧ / КАБИНЕТ','Кабинет «СЛИЧ»','Заявки, документы, переписка и согласование условий в одном месте.').replace('<h1>','<h1 id="portal-heading">').replace('<p class="lede">','<p class="lede" id="portal-subtitle">')+'<section class="section"><div class="container workflow-wrap"><div id="portal-auth" class="workflow-top"></div><p id="portal-error" class="workflow-error" role="alert"></p><p id="portal-notice" class="workflow-note" role="status"></p><div id="portal-body"><p>Проверяем подключение кабинета…</p></div><noscript><p>Для кабинета требуется JavaScript. Описание задачи можно подготовить отдельно.</p></noscript></div></section>'
      page('portal.html','Кабинет',portal,False,('portal-config.js','intake-core.js','portal.js'))
    solution=heading(t('СЛИЧ / РЕШЕНИЕ','SLEECH / SOLUTION'),t('Помогаем согласовать результаты контроля.','Help align inspection results.'),t('Для служб качества, ОТК и метрологов поставщика и заказчика, которым нужно разобраться с различающимися результатами или согласовать контроль перед поставкой.','For quality teams and metrologists who need to review disagreeing results or agree inspection before delivery.'))
    solution+='<section class="section"><div class="container workflow-wrap">'
    solution+=f'''<div class="workflow-grid"><article class="workflow-card"><span class="workflow-kicker">{t('Проверяемая проблема','Problem hypothesis')}</span><h2>{t('Требования есть. Причину расхождения ещё нужно установить.','Requirements exist. The disagreement still needs investigation.')}</h2><p>{t('Договор и техническая документация могут определять требования к продукции и порядок претензий. При этом для конкретного случая требуется собрать исходные записи, выяснить различия методов и условий и согласовать повторный контроль.','A contract and technical documentation can specify product requirements and complaint procedures. A particular case can still require collecting raw records, checking methods and conditions, and agreeing a repeat inspection.')}</p><p>{t('Частоту таких случаев, затраты на разбор и готовность платить пока проверяем. Мы не утверждаем, что договоры предприятий обязательно содержат пробелы.','Frequency, investigation costs and willingness to pay are being validated. We do not assume that company contracts necessarily have gaps.')}</p></article><aside class="workflow-card"><h2>{t('Что получит заказчик','What the customer receives')}</h2><ol><li>{t('Карточку случая и перечень исходных данных.','A case record and an input checklist.')}</li><li>{t('Карту различий в методах и условиях контроля.','A map of differences in methods and conditions.')}</li><li>{t('Согласованный план проверки или проект протокола.','An agreed review plan or draft protocol.')}</li><li>{t('Отчёт по согласованному объёму и следующие действия.','A report on the agreed scope and next actions.')}</li></ol><p class="workflow-note">{t('Недостаточность данных тоже может быть результатом анализа. Метрологическое заключение требует компетентного специалиста.','Insufficient evidence can also be a review outcome. A metrological conclusion requires a competent specialist.')}</p></aside></div>'''
    solution+=f'''<div class="workflow-facts"><article><span class="workflow-kicker">01</span><h3>{t('Опишите задачу','Describe the task')}</h3><p>{t('Короткий опрос определяет следующий шаг. Неясные и новые задачи поступают на предварительное уточнение.','A short questionnaire identifies the next step. Ambiguous or new tasks go through initial clarification.')}</p></article><article><span class="workflow-kicker">02</span><h3>{t('Согласуйте условия','Agree the scope')}</h3><p>{t('В карточке фиксируются состав работ, выдаваемые материалы, стоимость и версия согласования. Исполнитель, срок, ответственность и приёмка результата оформляются договором.','The case records the work, deliverables, price and accepted version. The contract defines the provider, deadline, responsibilities and acceptance criteria.')}</p></article><article><span class="workflow-kicker">03</span><h3>{t('Получите результат','Receive the result')}</h3><p>{t('Материалы, обсуждение и итог связаны с одним номером заявки. У каждой компании отдельный доступ.','Materials, discussion and the final result stay under one case reference. Each company has separate access.')}</p></article></div>'''
    solution+=f'''<article class="workflow-card"><h2>{t('Из чего складывается цена','How pricing works')}</h2><p>{t('Стоимость определяется согласованным объёмом: время команды, участие метролога, внешние измерения при необходимости и сопровождение. Влияют число характеристик и площадок, полнота исходных данных, число повторных проходов и необходимость выезда.','Price depends on the agreed scope: team time, specialist work, external measurements when required and coordination. Characteristics, sites, input completeness, repeated rounds and travel affect the estimate.')}</p><p>{t('На первом этапе проверяем разовую услугу. Цены действующего каталога — модельные ориентиры; они не подтверждены продажами и не являются окончательным предложением. Нельзя складывать подготовку повторно, если она уже включена в выбранный пакет.','The first commercial hypothesis is a one-off service. Catalogue prices are planning estimates, not validated sales prices or a final offer. Preparation must not be charged twice if already included in a package.')}</p><div class="workflow-actions"><a class="primary" href="start.html">{t('Подобрать следующий шаг','Find the next step')}</a><a class="secondary" href="services.html">{t('Каталог и состав работ','Catalogue and scope')}</a><a class="secondary" href="estimate.html">{t('Модель сметы','Estimate model')}</a></div></article>'''
    solution+=f'''<article class="workflow-card" style="margin-top:24px"><h2>{t('Стадия и подтверждение разработки','Stage and evidence')}</h2><p>{t('СЛИЧ — инициативный научно-исследовательский проект команды «Соавторы» и гипотеза B2B-стартапа. Прототип и программные проверки не подтверждают промышленный пилот, спрос или метрологическую пригодность всей процедуры.','SLEECH is an initiative research project by the Soavtory team and a B2B startup hypothesis. A prototype and software checks do not establish industrial validation, demand or fitness of the full measurement procedure.')}</p><p>{t('Патент не подтверждён. Оценка новизны и возможная регистрация программы — отдельные работы. Сейчас подтверждаем разработку версиями кода, описанием методики и будущими протоколами испытаний.','No granted patent is confirmed. Novelty assessment and possible software registration are separate work. Development is documented through source versions, method descriptions and future trial records.')}</p><a class="text-link" href="project.html">{t('Команда и план проверки ↗','Team and validation roadmap ↗')}</a></article></div></section>'''
    page('solution.html',t('Что мы предлагаем','What we offer'),solution,en)

# Integrate shared navigation and honest data wording across the current pages.
for file in list(DOCS.glob('*.html'))+list((DOCS/'en').glob('*.html')):
    text=file.read_text(); en=file.parent.name=='en';prefix='../' if en else ''
    if '<nav id="main-nav"' not in text: continue
    label='Client portal (RU)' if en else 'Кабинет'
    href='../portal.html' if en else 'portal.html'
    if 'assets/intake.css' not in text:
      text=text.replace('</head>',f'<link rel="stylesheet" href="{prefix}assets/intake.css?v={RELEASE}"></head>')
    if 'class="portal-nav"' not in text:
      text=text.replace('<a class="nav-action"',f'<a class="portal-nav" href="{href}">{label}</a><a class="nav-action"',1)
    if 'href="solution.html"' not in text.split('</nav>')[0]:
      text=text.replace('<summary>Ещё</summary><div>','<summary>Ещё</summary><div><a href="solution.html">Решение</a>',1) if not en else text.replace('<summary>More</summary><div>','<summary>More</summary><div><a href="solution.html">Our solution</a>',1)
    text=text.replace('Файлы и расчёты остаются в браузере. Выберите:', 'Локальные расчёты остаются в браузере. Заявки и файлы передаются только после подтверждения в кабинете. Выберите:')
    text=text.replace('Files and calculations stay in your browser. Choose:', 'Local calculations stay in your browser. Requests and attachments are sent only after confirmation in the portal. Choose:')
    text=re.sub(r'(assets/sleech-data\.js)\?v=[^"\s]+',rf'\1?v={RELEASE}',text)
    text=re.sub(r'(assets/intake\.css)\?v=[^"\s]+',rf'\1?v={RELEASE}',text)
    text=re.sub(r'(<a class="text-link"[^>]*>)([^<]*?) ↗</a>',r'\1\2</a>',text)
    file.write_text(text)

# Home page: the product is a workflow, not a single part or a metrology formula.
for en in (False,True):
    p=DOCS/('en' if en else '')/'index.html';text=p.read_text()
    if en:
      text=text.replace('Working prototype · No account needed · Data on your device','Planning without registration · Requests in a separate portal')
      text=text.replace('Start with one part.','Start with your task.')
      text=text.replace('Four steps to a brief you can discuss. The form does not submit a request.','Four answers to identify the next step. Prepare a brief, then confirm submission in the portal.')
    else:
      text=text.replace('Когда поставщик и заказчик видят разные цифры, нужен общий метод. Соединяем данные и разбор метролога, чтобы понять расхождение.','Разные результаты контроля мешают согласовать приёмку? Помогаем собрать данные сторон, проверить различия методов и условий и подготовить общий план проверки.')
      text=text.replace('Рабочий прототип · Без регистрации · Данные на вашем устройстве','Подбор без регистрации · Учебные инструменты · Кабинет заявок')
      text=text.replace('Одна деталь.<br><span>Две точки зрения.</span>','Одна задача.<br><span>Согласованные данные.</span>')
      text=text.replace('Начнём с одной детали.','Начнём с Вашей задачи.')
      text=text.replace('Четыре шага — и у вас черновик задачи для обсуждения. Форма ничего не отправляет.','Четыре ответа — и следующий шаг. Подготовьте описание и продолжите в кабинете для передачи команде.')
    if 'id="task-picker"' not in text:
      panel=('<section class="container" id="task-picker"><div class="workflow-card"><span class="workflow-kicker">'+('Start with your situation' if en else 'Сначала — Ваша ситуация')+'</span><h2>'+('What is blocking agreement?' if en else 'Что мешает согласовать контроль?')+'</h2><div class="workflow-options"><a href="start.html?stage=conflict">'+('Results disagree ↗' if en else 'Получили разные результаты ↗')+'</a><a href="start.html?stage=prevent">'+('Align before delivery ↗' if en else 'Хотим согласовать контроль заранее ↗')+'</a><a href="start.html?stage=unknown">'+('Need help defining the task ↗' if en else 'Нужно разобраться с задачей ↗')+'</a></div><p class="workflow-note">'+('First validation scenario: geometric measurements. Other characteristics need specialist review.' if en else 'Первый проверяемый сценарий — геометрические измерения. Другие показатели оцениваем со специалистом до подтверждения услуги.')+'</p></div></section>')
      text=text.replace('<section class="intro-section"',panel+'<section class="intro-section"',1)
    if 'assets/intake.css' not in text:text=text.replace('</head>',f'<link rel="stylesheet" href="'+('../' if en else '')+f'assets/intake.css?v={RELEASE}"></head>')
    p.write_text(text)

# Expand privacy description to cover the optional server; keep local calculation rules.
for en in (False,True):
    p=DOCS/('en' if en else '')/'privacy.html';text=p.read_text()
    if en:
      paragraph='<h2 id="portal">Client portal and submitted data</h2><p>The public GitHub Pages site does not run a database. Until a server is connected, submission is disabled. When connected, registering sends account details; submitting a request sends its confirmed description. Uploading a file sends it to that case. These actions are separate from local draft preferences.</p><p>The server stores accounts, organisations, requests, versioned scope, messages and attachments. Customers access their organisation only; the team accesses incoming cases. Internal team notes are not shown to customers. A session token is stored in sessionStorage for up to 12 hours; signing out revokes that session. Browser draft deletion does not delete server records.</p><p>The pilot uses anonymised material. The service provider, hosting, retention period, deletion process and commercial confidentiality terms must be agreed before real production data is accepted. A portal agreement does not replace the service contract.</p>'
      text=text.replace('This version does not upload them to a server or send a request to the team.','Local tools do not upload them. The separate portal can transmit confirmed requests when its server is connected.')
    else:
      paragraph='<h2 id="portal">Кабинет и передача данных</h2><p>Публичный сайт на GitHub Pages сам не запускает базу данных. Пока сервер кабинета не подключён, отправка недоступна. После подключения регистрация передаёт данные учётной записи; отправка заявки — подтверждённое описание; загрузка вложения — выбранный файл. Эти действия отделены от выбора режима локальных черновиков.</p><p>Сервер хранит учётные записи, организации, заявки, версии условий, переписку и вложения. Заказчик видит заявки своей организации; команда — входящие обращения. Внутренние заметки команды заказчику не передаются. Ключ сеанса хранится в sessionStorage до 12 часов; выход отзывает текущий сеанс. Удаление черновиков в браузере не удаляет серверную историю.</p><p>Пилот предназначен для обезличенных материалов. До приёма реальных производственных данных необходимо согласовать исполнителя, размещение сервера, сроки хранения, порядок удаления и условия конфиденциальности. Согласование в кабинете не заменяет договор на услугу. По вопросам доступа и удаления обращайтесь к ответственному исполнителю, указанному в договоре.</p>'
      text=text.replace('CSV, импортированные кейсы, поля форм и результаты расчётов обрабатываются в вашем браузере. Эта версия не загружает их на сервер и не отправляет заявку команде. Экспорт создаёт файл на вашем устройстве. Команда проекта не может получить ваши черновики через этот сайт.','CSV, импортированные локальные кейсы и результаты расчётов обрабатываются в Вашем браузере. Экспорт создаёт файл на устройстве. Локальные инструменты не отправляют эти материалы команде. Передача описания и вложений выполняется отдельными действиями в подключённом кабинете.')
      text=text.replace('Юридическое лицо, договор и канал передачи рабочих данных сайт не заявляет.','Юридическое лицо и заключённый договор сайт не заявляет; доступность канала передачи определяется подключением кабинета.')
      text=text.replace('Редакция: 27 октября 2026.','Редакция: 31 октября 2026.')
    if 'id="portal"' not in text:text=text.replace('<h2 id="hosting">',paragraph+'<h2 id="hosting">',1)
    p.write_text(text)

# Link older brief-preparation flows into the current intake without removing tools.
for en in (False,True):
    base=DOCS/('en' if en else '')
    for name in ['services.html','request.html','workspace.html','documents.html']:
      p=base/name;text=p.read_text()
      box='<div class="container"><p class="workflow-note"><a href="start.html">'+('Find a service and prepare a request ↗' if en else 'Подобрать услугу и подготовить заявку ↗')+'</a> · <a href="solution.html">'+('Scope, deliverables and pricing' if en else 'Проблема, результат и логика цены')+'</a></p></div>'
      if 'id="workflow-entry"' not in text:text=text.replace('<main id="main" tabindex="-1">','<main id="main" tabindex="-1"><div id="workflow-entry">'+box+'</div>',1)
      p.write_text(text)

# Focus and team roles are shared with project documentation; no false pilot claims.
focus={
 'release':'SLICH-WORKFLOW-2026-10-31',
 'product':'Цифровой сервис согласования измерений в цепочках поставок «СЛИЧ»',
 'problem_hypothesis':'Разбор различающихся результатов контроля при приёмке требует сбора исходных записей сторон, проверки методов и условий и согласования следующей проверки даже при наличии требований в договоре.',
 'customer':'Руководитель качества или предприятия; пользователи — ОТК, метрологи, технологи поставщика и заказчика.',
 'first_validation_scenario':'Согласование результатов геометрических измерений при приёмке продукции. Деталь — пример объекта, а не граница всего продукта.',
 'offer':'Документированный разбор одного согласованного случая с цифровым сопровождением.',
 'deliverables':['Карточка случая и перечень исходных данных','Карта различий методов и условий','Согласованный план проверки или проект протокола','Отчёт по согласованному объёму'],
 'status':'Инициативный научно-исследовательский проект и гипотеза B2B-стартапа. Спрос, пилот и патент не подтверждены.',
 'commercial_model':'Сначала проверяем разовую услугу; каталог и цены — модельные ориентиры.',
 'price_factors':['Время команды','Участие метролога','Внешние измерения','Количество характеристик и площадок','Повторные проходы','Выезд и сопровождение'],
 'roles':{'david':'Предприниматель: потребитель, ценность, цена, экономика, переговоры и развитие','aman':'Инженер: техническое решение, методика, данные, расчёты, разработка и проверка'},
 'limits':['Нет автоматического решения о годности','Недостаточность данных — допустимый вывод','Эксперт и измерения подтверждаются до договора','Не обещаем 100% распознавание описаний или устранение любого расхождения'],
 'validation':{'interviews':'План: интервью о последних реальных случаях, договорных требованиях, затратах и способах решения','pilot':'План: один обезличенный промышленный случай с измерением времени разбора и оценкой заказчика','confirmed':False},
 'source_of_truth':'GitHub: rdavid55/sleech',
 'portal':{'entry':'portal.html','api_configuration':'assets/portal-config.js','production_connected':False}
}
(DOCS/'product-focus.json').write_text(json.dumps(focus,ensure_ascii=False,indent=2)+'\n')
p=DOCS/'project-data.json';data=json.loads(p.read_text());data['release']=focus['release'];data['focus']=focus;data['team'][0]['role']=focus['roles']['david'];data['team'][1]['role']=focus['roles']['aman'];p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
# Local draft clearing includes the new intake. Sessions are deliberately separate.
p=DOCS/'assets/sleech-data.js';text=p.read_text();
if "'slich-intake-v2'" not in text:text=text.replace("'slich-brief-v1'","'slich-brief-v1','slich-intake-v2'")
p.write_text(text)
