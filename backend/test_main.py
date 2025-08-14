# test_main.py (Pytest for Backend)
from fastapi.testclient import TestClient
from backend.main import app, Verhoeff, UdyamRegistration, SessionLocal, Base, engine
import datetime
from sqlalchemy.orm import Session
import pytest

client = TestClient(app)

# A fixture to create a fresh database session for each test
@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean up the database after each test
        Base.metadata.drop_all(bind=engine)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 404

def test_submit_valid_proprietary_form(db_session: Session):
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123", # Valid Aadhaar (dummy Verhoeff)
            "ownername": "Test Proprietor",
            "aadhaarDeclaration": True,
            "organizationType": "1",
            "hasPan": "no",
            "pan": None,
            "panName": None,
            "dob": None,
            "dobType": None,
            "panDeclaration": None,
            "hasGstin": "no",
            "totalTurnoverA": 1000000,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 200
    assert "Form submitted successfully!" in response.json()['message']
    assert "id" in response.json()

def test_submit_valid_huf_form(db_session: Session):
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test HUF",
            "aadhaarDeclaration": True,
            "organizationType": "2",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": "HUF Karta Name",
            "dob": "15/05/1980",
            "dobType": "DOB",
            "panDeclaration": True,
            "hasGstin": "yes",
            "totalTurnoverA": 5000000,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 200
    assert "Form submitted successfully!" in response.json()['message']
    assert "id" in response.json()

def test_submit_invalid_aadhaar_length():
    response = client.post(
        "/submit",
        json={
            "adharno": "123",
            "ownername": "Test User",
            "aadhaarDeclaration": True,
            "organizationType": "1",
            "hasPan": "no",
            "hasGstin": "no",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Aadhaar must be 12 digits long." in response.json()['detail'][0]['msg']

def test_submit_invalid_aadhaar_non_numeric():
    response = client.post(
        "/submit",
        json={
            "adharno": "1234567890AB",
            "ownername": "Test User",
            "aadhaarDeclaration": True,
            "organizationType": "1",
            "hasPan": "no",
            "hasGstin": "no",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Aadhaar must be 12 digits and contain only numbers." in response.json()['detail'][0]['msg']

def test_submit_invalid_aadhaar_starts_with_0_or_1():
    response = client.post(
        "/submit",
        json={
            "adharno": "012345678901",
            "ownername": "Test User",
            "aadhaarDeclaration": True,
            "organizationType": "1",
            "hasPan": "no",
            "hasGstin": "no",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Aadhaar number cannot start with 0 or 1." in response.json()['detail'][0]['msg']

def test_submit_aadhaar_declaration_not_checked():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test User",
            "aadhaarDeclaration": False,
            "organizationType": "1",
            "hasPan": "no",
            "hasGstin": "no",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "You must agree to the Aadhaar declaration." in response.json()['detail'][0]['msg']

def test_submit_pan_missing_for_non_proprietary():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Partner",
            "aadhaarDeclaration": True,
            "organizationType": "3",
            "hasPan": "no",
            "hasGstin": "no",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "PAN is mandatory for this type of organization. Please select \"Yes\"." in response.json()['detail'][0]['msg']

def test_submit_invalid_pan_format():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE12345",
            "panName": "Company Name",
            "dob": "01/01/2000",
            "dobType": "DOI",
            "panDeclaration": True,
            "hasGstin": "yes",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Invalid PAN format (e.g., ABCDE1234F)." in response.json()['detail'][0]['msg']

def test_submit_pan_name_missing_when_pan_required():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": None, # Should be None or an empty string for the Pydantic validator to catch it
            "dob": "01/01/2000",
            "dobType": "DOI",
            "panDeclaration": True,
            "hasGstin": "yes",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Name of PAN Holder is required." in response.json()['detail'][0]['msg']

def test_submit_dob_missing_when_pan_required():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": "Company Name",
            "dob": None,
            "dobType": "DOI",
            "panDeclaration": True,
            "hasGstin": "yes",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "DOB or DOI is required." in response.json()['detail'][0]['msg']

def test_submit_invalid_dob_format():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": "Company Name",
            "dob": "2023-01-01",
            "dobType": "DOI",
            "panDeclaration": True,
            "hasGstin": "yes",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Date format is DD/MM/YYYY." in response.json()['detail'][0]['msg']

def test_submit_future_dob():
    future_date = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%d/%m/%Y")
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": "Company Name",
            "dob": future_date,
            "dobType": "DOI",
            "panDeclaration": True,
            "hasGstin": "yes",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Date cannot be in the future." in response.json()['detail'][0]['msg']

def test_submit_pan_declaration_not_checked():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": "Company Name",
            "dob": "01/01/2000",
            "dobType": "DOI",
            "panDeclaration": False,
            "hasGstin": "yes",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "You must agree to the PAN declaration." in response.json()['detail'][0]['msg']

def test_submit_gstin_mandatory_for_high_turnover():
    response = client.post(
        "/submit",
        json={
            "adharno": "234567890123",
            "ownername": "Test Company",
            "aadhaarDeclaration": True,
            "organizationType": "5",
            "hasPan": "yes",
            "pan": "ABCDE1234F",
            "panName": "Company Name",
            "dob": "01/01/2000",
            "dobType": "DOI",
            "panDeclaration": True,
            "hasGstin": "no",
            "totalTurnoverA": 5000000,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "GSTIN is mandatory if turnover exceeds ₹40 Lakhs." in response.json()['detail'][0]['msg']

def test_verhoeff_algorithm_valid():
    base_num = "12345678901"
    checksum = Verhoeff().generate(base_num)
    valid_aadhaar = base_num + str(checksum)
    assert Verhoeff().validate(valid_aadhaar) == True

def test_verhoeff_algorithm_invalid():
    base_num = "12345678901"
    checksum = Verhoeff().generate(base_num)
    valid_aadhaar = base_num + str(checksum)
    
    invalid_aadhaar = list(valid_aadhaar)
    invalid_aadhaar[0] = '9' if invalid_aadhaar[0] == '1' else '1'
    invalid_aadhaar = "".join(invalid_aadhaar)
    
    assert Verhoeff().validate(invalid_aadhaar) == False

def test_submit_aadhaar_verhoeff_invalid():
    # An Aadhaar number that passes basic regex but fails the Verhoeff algorithm
    invalid_aadhaar = "234567890121" # Fails checksum
    response = client.post(
        "/submit",
        json={
            "adharno": invalid_aadhaar,
            "ownername": "Test User",
            "aadhaarDeclaration": True,
            "organizationType": "1",
            "hasPan": "no",
            "hasGstin": "no",
            "totalTurnoverA": 0,
            "totalTurnoverB": 0,
        },
    )
    assert response.status_code == 422
    assert "Invalid Aadhaar number (checksum failed)." in response.json()['detail'][0]['msg']