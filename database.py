import datetime
import random
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./cardio_ai.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    passcode = Column(String)
    region = Column(String)  # Viloyat nomi
    district = Column(String, nullable=True)  # Tuman/Shahar
    village = Column(String, nullable=True)  # Qishloq/Mahalla
    street = Column(String, nullable=True)  # Ko'cha
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)  # YYYY-MM-DD format
    is_admin = Column(Integer, default=0)

def get_uzbekistan_time():
    return datetime.datetime.utcnow() + datetime.timedelta(hours=5)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, index=True)  # Cardio-ID
    first_name = Column(String)
    last_name = Column(String)
    birth_year = Column(Integer)
    gender = Column(String)
    phone = Column(String)
    region = Column(String, nullable=True)
    district = Column(String, nullable=True)
    village = Column(String, nullable=True)
    street = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_uzbekistan_time)

class ECGAnalysis(Base):
    __tablename__ = "ecg_analyses"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"))
    symptoms = Column(Text)  # Comma-separated or JSON
    blood_pressure_sys = Column(Integer)
    blood_pressure_dia = Column(Integer)
    pulse = Column(Integer)
    image_path = Column(String)
    classification = Column(String)  # NORMAL, ARRHYTHMIA, ISCHEMIA, ACUTE_INFARCTION
    details = Column(Text)  # JSON details of ECG findings
    created_at = Column(DateTime, default=get_uzbekistan_time)
UZ_LOCATIONS = {
    "Toshkent shahri": {
        "Yunusobod tumani": ["Amir Temur shoh ko'chasi", "Ahmad Donish ko'chasi", "Bog'ishamol ko'chasi", "Yangishahar ko'chasi"],
        "Chilonzor tumani": ["Bunyodkor shoh ko'chasi", "Muqimiy ko'chasi", "Lutfiy ko'chasi", "Qatortol ko'chasi"],
        "Mirobod tumani": ["Nukus ko'chasi", "Shahrisabz ko'chasi", "Taras Shevchenko ko'chasi", "Farg'ona yo'li ko'chasi"]
    },
    "Toshkent viloyati": {
        "Zangiota tumani": ["Mustaqillik ko'chasi", "Eshonguzar ko'chasi", "Toshkent yo'li ko'chasi"],
        "Parkent tumani": ["Parkent ko'chasi", "So'qoq ko'chasi", "Zarkent ko'chasi"],
        "Chirchiq shahri": ["Alisher Navoiy ko'chasi", "Sportivnaya ko'chasi", "Gagarin ko'chasi"]
    },
    "Samarqand viloyati": {
        "Samarqand shahri": ["Registon ko'chasi", "Dagbit ko'chasi", "Universitet xiyoboni", "Gagarin ko'chasi"],
        "Bulung'ur tumani": ["Mustaqillik ko'chasi", "Amir Temur ko'chasi"],
        "Urgut tumani": ["Urgut ko'chasi", "Juma ko'chasi"]
    },
    "Farg'ona viloyati": {
        "Farg'ona shahri": ["Al-Farg'oniy ko'chasi", "Sayilgoh ko'chasi", "Mustaqillik ko'chasi"],
        "Marg'ilon shahri": ["Marg'iloniy ko'chasi", "Yipakchi ko'chasi", "Ahmad Yassaviy ko'chasi"],
        "Qo'qon shahri": ["Turkiston ko'chasi", "Navoiy ko'chasi", "Istiqlol ko'chasi"]
    },
    "Andijon viloyati": {
        "Andijon shahri": ["Bobur shoh ko'chasi", "Alisher Navoiy ko'chasi", "Mustaqillik ko'chasi"],
        "Asaka tumani": ["Asaka ko'chasi", "O'zbekiston ko'chasi"],
        "Shahrixon tumani": ["Farg'ona yo'li ko'chasi", "Tinchlik ko'chasi"]
    },
    "Buxoro viloyati": {
        "Buxoro shahri": ["Bahouddin Naqshband ko'chasi", "Ibn Sino ko'chasi", "Murtazoev ko'chasi"],
        "G'ijduvon tumani": ["G'ijduvon ko'chasi", "Tinchlik ko'chasi"],
        "Qorako'l tumani": ["Mustaqillik ko'chasi", "Alpomish ko'chasi"]
    },
    "Namangan viloyati": {
        "Namangan shahri": ["Kosonsoy ko'chasi", "Uychi ko'chasi", "Alisher Navoiy ko'chasi"],
        "Chust tumani": ["Chust ko'chasi", "Do'stlik shoh ko'chasi"]
    },
    "Qoraqalpog'iston Respublikasi": {
        "Nukus shahri": ["Qoraqalpog'iston ko'chasi", "Beruniy ko'chasi", "Amir Temur ko'chasi"],
        "Qo'ng'irot tumani": ["Nukus ko'chasi", "Turtkul yo'li"]
    },
    "Qashqadaryo viloyati": {
        "Qarshi shahri": ["Mustaqillik ko'chasi", "Amir Temur ko'chasi", "Nasaf ko'chasi"],
        "Shahrisabz shahri": ["Alisher Navoiy ko'chasi", "Qarshi ko'chasi"]
    },
    "Surxondaryo viloyati": {
        "Termiz shahri": ["Termiz ko'chasi", "Alisher Navoiy ko'chasi", "Mustaqillik ko'chasi"],
        "Denov tumani": ["Denov ko'chasi", "Boysun ko'chasi"]
    },
    "Xorazm viloyati": {
        "Urganch shahri": ["Al-Xorazmiy ko'chasi", "Mustaqillik ko'chasi", "Tinchlik ko'chasi"],
        "Xiva shahri": ["Pahlavon Mahmud ko'chasi", "Xiva ko'chasi"]
    },
    "Navoiy viloyati": {
        "Navoiy shahri": ["Galaba shoh ko'chasi", "Alisher Navoiy ko'chasi", "Tinchlik ko'chasi"],
        "Zarafshon shahri": ["Zarafshon ko'chasi", "Mustaqillik ko'chasi"]
    },
    "Jizzax viloyati": {
        "Jizzax shahri": ["Sharaf Rashidov ko'chasi", "Alisher Navoiy ko'chasi"],
        "Zomin tumani": ["Zomin ko'chasi", "Tinchlik ko'chasi"]
    },
    "Sirdaryo viloyati": {
        "Guliston shahri": ["Mustaqillik ko'chasi", "Alisher Navoiy ko'chasi"],
        "Sirdaryo tumani": ["Guliston ko'chasi", "Do'stlik ko'chasi"]
    }
}

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # SQLite schema migration check
    import sqlite3
    import os
    db_file = "cardio_ai.db"
    if os.path.exists(db_file):
        try:
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(users)")
            existing_columns = [col[1] for col in cursor.fetchall()]
            
            new_cols = {
                "district": "TEXT",
                "village": "TEXT",
                "street": "TEXT",
                "is_admin": "INTEGER DEFAULT 0"
            }
            for col_name, col_type in new_cols.items():
                if col_name not in existing_columns:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                    print(f"Added column {col_name} to users table via migration.")
            
            # Migrate patients table
            cursor.execute("PRAGMA table_info(patients)")
            existing_patient_cols = [col[1] for col in cursor.fetchall()]
            new_patient_cols = {
                "region": "TEXT",
                "district": "TEXT",
                "village": "TEXT",
                "street": "TEXT"
            }
            for col_name, col_type in new_patient_cols.items():
                if col_name not in existing_patient_cols:
                    cursor.execute(f"ALTER TABLE patients ADD COLUMN {col_name} {col_type}")
                    print(f"Added column {col_name} to patients table via migration.")
                    
            # Adjust any future-dated records to be in the past relative to Uzbekistan local time
            now_uz = get_uzbekistan_time()
            
            # Adjust analyses
            cursor.execute("SELECT id, created_at FROM ecg_analyses")
            analyses = cursor.fetchall()
            for a_id, created_at_str in analyses:
                if created_at_str:
                    try:
                        dt = datetime.datetime.strptime(created_at_str.split('.')[0], "%Y-%m-%d %H:%M:%S")
                        if dt > now_uz:
                            new_dt = dt - datetime.timedelta(days=30)
                            if new_dt > now_uz:
                                new_dt = now_uz - datetime.timedelta(hours=random.randint(1, 24))
                            new_dt_str = new_dt.strftime("%Y-%m-%d %H:%M:%S.%f")
                            cursor.execute("UPDATE ecg_analyses SET created_at = ? WHERE id = ?", (new_dt_str, a_id))
                    except Exception as e:
                        print(f"Error adjusting date for analysis {a_id}: {e}")
                        
            # Adjust patients
            cursor.execute("SELECT id, created_at FROM patients")
            patients = cursor.fetchall()
            for p_id, created_at_str in patients:
                if created_at_str:
                    try:
                        dt = datetime.datetime.strptime(created_at_str.split('.')[0], "%Y-%m-%d %H:%M:%S")
                        if dt > now_uz:
                            new_dt = dt - datetime.timedelta(days=30)
                            if new_dt > now_uz:
                                new_dt = now_uz - datetime.timedelta(hours=random.randint(1, 24))
                            new_dt_str = new_dt.strftime("%Y-%m-%d %H:%M:%S.%f")
                            cursor.execute("UPDATE patients SET created_at = ? WHERE id = ?", (new_dt_str, p_id))
                    except Exception as e:
                        print(f"Error adjusting date for patient {p_id}: {e}")

            conn.commit()
            conn.close()
        except Exception as migration_error:
            print(f"Migration error: {migration_error}")

    # Ensure uploads directory exists and copy mock_ecg.png there as mock_ecg.jpg
    import shutil
    os.makedirs("uploads", exist_ok=True)
    if os.path.exists("static/mock_ecg.png") and not os.path.exists("uploads/mock_ecg.jpg"):
        shutil.copy("static/mock_ecg.png", "uploads/mock_ecg.jpg")
        
    # Seeding mock data if empty
    db = SessionLocal()
    try:
        # Check if users already seeded
        if db.query(User).count() == 0:
            # Add a default admin feldsher
            default_user = User(
                phone="+998945651539",
                passcode="288019701966200120042026",
                region="Toshkent viloyati",
                district="Zangiota tumani",
                village="Zangiota qishlog'i",
                street="Mustaqillik ko'chasi",
                first_name="Admin",
                last_name="Yurak NN",
                birth_date="1985-02-09",
                is_admin=1
            )
            db.add(default_user)
            
            # Add other regional users/nurses
            regions = [
                ("Toshkent viloyati", "Parkent tumani", "Krasnogorsk qishlog'i", "Temiryo'l ko'chasi", "Malika", "Karimova"),
                ("Toshkent viloyati", "Chinoz tumani", "Gullar mahallasi", "Ipak Yo'li ko'chasi", "Sardor", "Ergashev"),
                ("Toshkent viloyati", "Bo'stonliq tumani", "G'azalkent sh.", "Lutfiy ko'chasi", "Feruza", "Sodiqova"),
                ("Toshkent viloyati", "Yangiyo'l tumani", "Qutlug' mahallasi", "Navro'z ko'chasi", "Jasur", "Ubaydullayev"),
                ("Toshkent viloyati", "Oqqo'rg'on tumani", "Boyovut qishlog'i", "Chinobod ko'chasi", "Nigora", "Hasanova")
            ]
            for i, reg in enumerate(regions):
                db.add(User(
                    phone=f"+99891000000{i+1}", 
                    passcode="1234", 
                    region=reg[0],
                    district=reg[1],
                    village=reg[2],
                    street=reg[3],
                    first_name=reg[4],
                    last_name=reg[5],
                    birth_date=f"199{i}-05-1{i}",
                    is_admin=0
                ))
            
            db.commit()
            
            # Seed historic data for June and July 2026 to populate the President Dashboard
            print("Seeding historic ECG data for June and July 2026...")
            
            first_names_m = ["Sardor", "Otabek", "Javohir", "Anvar", "Rustam", "Jasur", "Farhod", "Dilshod"]
            first_names_f = ["Malika", "Zilola", "Shahnoza", "Madina", "Guli", "Feruza", "Nigora", "Dilnoza"]
            last_names = ["Karimov", "Rahimov", "Sodiqov", "Abduvaliyev", "Usmonov", "Aliyev", "Toshpulatov", "Hasanov"]
            
            regions_list = ["Zangiota TTB", "Parkent TTB", "Chinoz TTB", "Bo'stonliq TTB", "Yangiyo'l TTB", "Oqqo'rg'on TTB"]
            classifications = ["NORMAL", "ARRHYTHMIA", "ISCHEMIA", "ACUTE_INFARCTION"]
            weights = [0.60, 0.15, 0.15, 0.10]  # Probability distribution of cases
            
            # Generate cases between 2026-06-01 and current Uzbekistan local time
            start_date = datetime.datetime(2026, 6, 1)
            end_date = get_uzbekistan_time()
            delta_days = (end_date - start_date).days
            
            # Generate about 150 historical cases
            for i in range(1, 151):
                random_days = random.randint(0, delta_days)
                random_hours = random.randint(8, 20)
                random_minutes = random.randint(0, 59)
                created_date = start_date + datetime.timedelta(days=random_days, hours=random_hours, minutes=random_minutes)
                created_date = min(created_date, end_date)
                
                gender = random.choice(["Erkak", "Ayol"])
                first_name = random.choice(first_names_m) if gender == "Erkak" else random.choice(first_names_f)
                last_name = random.choice(last_names)
                if gender == "Ayol" and not last_name.endswith("a"):
                    # quick feminization of Uzbek last name for authenticity
                    if last_name.endswith("ov"):
                        last_name = last_name[:-2] + "ova"
                    elif last_name.endswith("ev"):
                        last_name = last_name[:-2] + "eva"
                
                birth_year = random.randint(1950, 1995)
                phone = f"+99893{random.randint(1000000, 9999999)}"
                cardio_id = f"CARDIO-{random.randint(100000, 999999)}"
                
                # Check if patient exists, if not create
                patient = db.query(Patient).filter(Patient.phone == phone).first()
                if not patient:
                    reg = random.choice(list(UZ_LOCATIONS.keys()))
                    dist = random.choice(list(UZ_LOCATIONS[reg].keys()))
                    str_name = random.choice(UZ_LOCATIONS[reg][dist])
                    village = f"{dist.split()[0]} MFY"
                    
                    patient = Patient(
                        id=cardio_id,
                        first_name=first_name,
                        last_name=last_name,
                        birth_year=birth_year,
                        gender=gender,
                        phone=phone,
                        region=reg,
                        district=dist,
                        village=village,
                        street=str_name,
                        created_at=created_date
                    )
                    db.add(patient)
                    db.commit()
                    db.refresh(patient)
                
                # Create ECG Analysis
                classification = random.choices(classifications, weights=weights)[0]
                
                # Symptoms based on classification
                symptom_pool = ["ko'krak qafasidagi og'riq", "chap qo'lga og'riq berishi", "nafas qisilishi", "sovuq ter bosishi"]
                import json
                if classification == "ACUTE_INFARCTION":
                    symptoms_chosen = ["ko'krak qafasidagi og'riq", "chap qo'lga og'riq berishi", "sovuq ter bosishi"]
                    sys_bp = random.randint(140, 190)
                    dia_bp = random.randint(90, 110)
                    pulse = random.randint(90, 120)
                    details_dict = {
                        "st_elevation": "Elevatsiya V1-V4 da 2.5mm",
                        "t_inversion": "Yo'q",
                        "q_wave": "Chuqurlashgan",
                        "arrhythmia": "Yo'q",
                        "comment_uz": "DIQQAT: Chap qorincha old devori O'tkir Miokard Infarkti (STEMI) belgilari aniqlandi! Bemorga zudlik bilan birinchi yordam ko'rsatilishi va shoshilinch shifoxonaga yuborilishi zarur.",
                        "comment_ru": "ВНИМАНИЕ: Выявлены признаки Острого Инфаркта Миокарда (STEMI) передней стенки левого желудочка! Требуется немедленная первая помощь и экстренная госпитализация.",
                        "first_aid_uz": [
                            "Bemorni zudlik bilan gorizontal yotqizish va tinchlantirish (boshi biroz balandroq).",
                            "Toza havo kirishini ta'minlash (torg kiyimlarni yechish, oynani ochish).",
                            "Agar qarshi ko'rsatma bo'lmasa, zudlik bilan 300 mg Aspirin chaynattirish.",
                            "Til ostiga 1 ta Nitroglicerin tabletkasi yoki spreyi berish (arterial bosim nazorati ostida, bosim 100 mm sm. ust. dan yuqori bo'lsa).",
                            "Zudlik bilan Reanimatsiya brigadasini (103) chaqirish va hayotiy ko'rsatkichlarni har 5 daqiqada o'lchab borish."
                        ],
                        "first_aid_ru": [
                            "Немедленно уложить пациента горизонтально, обеспечить покой (голова приподнята).",
                            "Обеспечить доступ свежего воздуха (расстегнуть одежду, открыть окно).",
                            "Разжевать 300 мг Аспирина (при отсутствии противопоказаний).",
                            "Дать Нитроглицерин под язык (под контролем артериального давления, при систолическом АД > 100 мм рт. ст.).",
                            "Срочно вызвать реанимационную бригаду скорой помощи (103) и измерять жизненные показатели каждые 5 минут."
                        ]
                    }
                elif classification == "ISCHEMIA":
                    symptoms_chosen = random.sample(symptom_pool, 2)
                    sys_bp = random.randint(130, 160)
                    dia_bp = random.randint(85, 98)
                    pulse = random.randint(75, 95)
                    details_dict = {
                        "st_elevation": "Yo'q",
                        "t_inversion": "Inversiya II, III, aVF da",
                        "q_wave": "Normal",
                        "arrhythmia": "Yo'q",
                        "comment_uz": "EKG tahlili: Yurak mushaklari ishemiyasi (qon bilan ta'minlanishining kamayishi) belgilari. Jismoniy zo'riqish cheklansin.",
                        "comment_ru": "Анализ ЭКГ: Выявлены признаки ишемии миокарда (недостаточность кровоснабжения). Ограничить физические нагрузки.",
                        "first_aid_uz": [
                            "Har qanday jismoniy va hissiy zo'riqishlarni zudlik bilan to'xtatish.",
                            "Bemorni qulay o'tirish yoki yotish holatiga keltirish, kiyimlarini bo'shatish.",
                            "Til ostiga 1 ta Nitroglicerin tabletkasi yoki spreyi berish (bosim nazorati ostida).",
                            "Agar og'riq nitroglicerin qabul qilgandan keyin 15 daqiqa ichida o'tmasa, zudlik bilan 103 chaqirish va Aspirin berish.",
                            "Yaqin vaqt ichida kardiolog ko'rigidan o'tishni tashkil qilish."
                        ],
                        "first_aid_ru": [
                            "Немедленно прекратить любые физические и эмоциональные нагрузки.",
                            "Усадить или уложить пациента в удобное положение, расстегнуть стесняющую одежду.",
                            "Дать Нитроглицерин под язык (под контролем артериального давления).",
                            "Если боль не проходит в течение 15 минут после приема нитроглицерина, срочно вызвать 103 и дать Аспирин.",
                            "В ближайшее время организовать осмотр кардиолога."
                        ]
                    }
                elif classification == "ARRHYTHMIA":
                    symptoms_chosen = ["nafas qisilishi"]
                    sys_bp = random.randint(110, 145)
                    dia_bp = random.randint(70, 90)
                    pulse = random.choice([random.randint(45, 59), random.randint(100, 140)])
                    details_dict = {
                        "st_elevation": "Yo'q",
                        "t_inversion": "Yo'q",
                        "q_wave": "Normal",
                        "arrhythmia": "R-R intervali notekisligi (Arifmiya/Fibrilyatsiya)",
                        "comment_uz": "EKG tahlili: Ritm buzilishi (Aritmiya / Bo'lmachalar fibrilyatsiyasi) aniqlandi. Rejaviy kardiolog maslahati tavsiya etiladi.",
                        "comment_ru": "Анализ ЭКГ: Выявлено нарушение ритма (Аритмия / Фибрилляция предсердий). Рекомендуется плановая консультация кардиолога.",
                        "first_aid_uz": [
                            "Bemorni tinch holatda yotqizish yoki qulay o'tirish holatiga keltirish.",
                            "Klinik ko'rsatkichlarni (pulsning ritmikligi, chastotasi va qon bosimini) o'lchash va yozib borish.",
                            "Agar kuchli taxikardiya kuzatilsa, shifokor nazoratida vagal sinamalarni bajarish (yuzni sovuq suvda yuvish, chuqur nafas olib ushlab turish).",
                            "Bemorda kuchli xavotir yoki qo'rquv bo'lsa, tinchlantiruvchi sedativ vositalar berish.",
                            "Kardiologga murojaat qilish va qo'shimcha EKG monitoringini davom ettirish."
                        ],
                        "first_aid_ru": [
                            "Уложить или удобно усадить пациента, обеспечить полный покой.",
                            "Измерить и зафиксировать клинические показатели (ритмичность, частота пульса и артериальное давление).",
                            "При выраженной тахикардии провести вагусные пробы (умывание лица холодной водой, задержка дыхания на вдохе).",
                            "При сильном страхе или панике дать пациенту успокоительное (седативное) средство.",
                            "Обратиться к кардиологу для дальнейшего прохождения ЭКГ-мониторинга."
                        ]
                    }
                else:  # NORMAL
                    symptoms_chosen = []
                    if random.random() > 0.8:
                        symptoms_chosen.append(random.choice(symptom_pool))
                    sys_bp = random.randint(110, 129)
                    dia_bp = random.randint(70, 84)
                    pulse = random.randint(60, 80)
                    details_dict = {
                        "st_elevation": "Yo'q",
                        "t_inversion": "Yo'q",
                        "q_wave": "Normal",
                        "arrhythmia": "Yo'q",
                        "comment_uz": "EKG tahlili: Patologik o'zgarishlar aniqlanmadi. Yurak urish maromi va ritmi me'yorda.",
                        "comment_ru": "Анализ ЭКГ: Патологических изменений не обнаружено. Ритм и частота сердечных сокращений в норме.",
                        "first_aid_uz": [
                            "Sog'lom turmush tarziga rioya qilish.",
                            "Rejaviy tibbiy ko'riklardan o'z vaqtida o'tib turish."
                        ],
                        "first_aid_ru": [
                            "Соблюдать здоровый образ жизни.",
                            "Своевременно проходить плановые медицинские осмотры."
                        ]
                    }
                
                details = json.dumps(details_dict)
                
                analysis = ECGAnalysis(
                    patient_id=patient.id,
                    symptoms=";".join(symptoms_chosen),
                    blood_pressure_sys=sys_bp,
                    blood_pressure_dia=dia_bp,
                    pulse=pulse,
                    image_path="uploads/mock_ecg.jpg",
                    classification=classification,
                    details=details,
                    created_at=created_date
                )
                db.add(analysis)
            
            db.commit()
            print("Mock data seeded successfully!")
            
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
