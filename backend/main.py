# main.py (FastAPI Backend)
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, field_validator, FieldValidationInfo
import re
from typing import Optional, Annotated
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.dialects.postgresql import FLOAT

app = FastAPI()

# CORS Middleware to allow communication with your frontend
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Configuration ---
DATABASE_URL = "postgre_uri"  # Replace with your actual PostgreSQL URI

engine = create_engine(DATABASE_URL)
Base = declarative_base()

class UdyamRegistration(Base):
    __tablename__ = "udyam_registrations"
    id = Column(Integer, primary_key=True, index=True)
    adharno = Column(String, unique=True, index=True)
    ownername = Column(String)
    organization_type = Column(String)
    pan = Column(String, unique=True, nullable=True)
    pan_name = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    aadhaarDeclaration = Column(Boolean)
    hasPan = Column(String)
    dobType = Column(String, nullable=True)
    panDeclaration = Column(Boolean, nullable=True)
    hasGstin = Column(String, nullable=True)
    totalTurnoverA = Column(FLOAT, nullable=True)
    totalTurnoverB = Column(FLOAT, nullable=True)

Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Verhoeff Algorithm for Aadhaar Checksum ---
class Verhoeff:
    __mul = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ]
    __per = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 7, 6, 5, 9, 3, 0, 1],
        [2, 7, 9, 3, 8, 0, 1, 5, 4, 6],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ]
    __inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

    def validate(self, num_str):
        c = 0
        for i, item in enumerate(reversed(num_str)):
            c = self.__mul[c][self.__per[i % 8][int(item)]]
        return c == 0

    def generate(self, num_str):
        c = 0
        for i, item in enumerate(reversed(num_str)):
            c = self.__mul[c][self.__per[(i + 1) % 8][int(item)]]
        return self.__inv[c]

# Pydantic Model for PAN Validation Request
class PanValidationRequest(BaseModel):
    pan: str
    panName: str
    dob: str
    dobType: str

    @field_validator('pan')
    @classmethod
    def validate_pan_format(cls, v: str) -> str:
        if not re.fullmatch(r'^[A-Z]{5}\d{4}[A-Z]{1}$', v):
            raise ValueError('Invalid PAN format (e.g., ABCDE1234F).')
        return v

    @field_validator('dob')
    @classmethod
    def validate_dob_format(cls, v: str) -> str:
        if not re.fullmatch(r'^\d{2}\/\d{2}\/\d{4}$', v):
            raise ValueError('Date format is DD/MM/YYYY.')
        try:
            day, month, year = map(int, v.split('/'))
            input_date = datetime.date(year, month, day)
            today = datetime.date.today()
            if input_date > today:
                raise ValueError('Date cannot be in the future.')
        except ValueError:
            raise ValueError('Invalid date provided.')
        return v

# --- Pydantic Model for Final Submission Request Body ---
class UdyamFormRequest(BaseModel):
    adharno: str = Field(..., min_length=12, max_length=12, description="Aadhaar number")
    ownername: str = Field(..., min_length=1, max_length=100, description="Name of Entrepreneur")
    aadhaarDeclaration: bool = Field(..., description="Aadhaar declaration consent")
    organizationType: str = Field(..., description="Type of Organisation")
    hasPan: str = Field(..., description="Does the organization have PAN?")
    pan: Optional[str] = Field(None, min_length=10, max_length=10, description="PAN number")
    panName: Optional[str] = Field(None, min_length=1, max_length=100, description="Name of PAN Holder")
    dob: Optional[str] = Field(None, description="Date of Birth or Incorporation (DD/MM/YYYY)")
    dobType: Optional[str] = Field(None, description="Type of Date (DOB/DOI)")
    panDeclaration: Optional[bool] = Field(None, description="PAN declaration consent")
    hasGstin: Optional[str] = Field(None, description="Does the organization have GSTIN?")
    totalTurnoverA: Optional[float] = Field(None, description="Total Turnover (A)")
    totalTurnoverB: Optional[float] = Field(None, description="Total Turnover (B)")

    @field_validator('adharno')
    @classmethod
    def validate_adharno(cls, v: str, info: FieldValidationInfo) -> str:
        if not re.fullmatch(r'^\d{12}$', v):
            raise ValueError('Aadhaar must be 12 digits and contain only numbers.')
        if not Verhoeff().validate(v):
            raise ValueError('Invalid Aadhaar number (checksum failed).')
        if v.startswith('0') or v.startswith('1'):
            raise ValueError('Aadhaar number cannot start with 0 or 1.')
        return v

    @field_validator('organizationType')
    @classmethod
    def validate_organization_type(cls, v: str) -> str:
        if v == '0':
            raise ValueError('Please select a valid type of organisation.')
        return v

    @field_validator('pan')
    @classmethod
    def validate_pan(cls, v: Optional[str], info: FieldValidationInfo) -> Optional[str]:
        non_proprietary_org_types = {'2', '3', '4', '5', '6', '7', '8', '9', '10', '11'}
        is_pan_required = info.data.get('organizationType') in non_proprietary_org_types
        has_pan_field = info.data.get('hasPan')

        if is_pan_required:
            if has_pan_field == 'no':
                raise ValueError('PAN is mandatory for this type of organization. Please select "Yes".')
            if has_pan_field == 'yes':
                if not v:
                    raise ValueError('PAN number is required.')
                if not re.fullmatch(r'^[A-Z]{5}\d{4}[A-Z]{1}$', v):
                    raise ValueError('Invalid PAN format (e.g., ABCDE1234F).')
        return v

    @field_validator('panName')
    @classmethod
    def validate_pan_name(cls, v: Optional[str], info: FieldValidationInfo) -> Optional[str]:
        non_proprietary_org_types = {'2', '3', '4', '5', '6', '7', '8', '9', '10', '11'}
        is_pan_required = info.data.get('organizationType') in non_proprietary_org_types
        has_pan_field = info.data.get('hasPan')

        if is_pan_required and has_pan_field == 'yes':
            if not v:
                raise ValueError('Name of PAN Holder is required.')
        return v

    @field_validator('dob')
    @classmethod
    def validate_dob(cls, v: Optional[str], info: FieldValidationInfo) -> Optional[str]:
        non_proprietary_org_types = {'2', '3', '4', '5', '6', '7', '8', '9', '10', '11'}
        is_pan_required = info.data.get('organizationType') in non_proprietary_org_types
        has_pan_field = info.data.get('hasPan')

        if is_pan_required and has_pan_field == 'yes':
            if not v:
                raise ValueError('DOB or DOI is required.')
            if not re.fullmatch(r'^\d{2}\/\d{2}\/\d{4}$', v):
                raise ValueError('Date format is DD/MM/YYYY.')
            
            try:
                day, month, year = map(int, v.split('/'))
                input_date = datetime.date(year, month, day)
                today = datetime.date.today()
                if input_date > today:
                    raise ValueError('Date cannot be in the future.')
            except ValueError:
                raise ValueError('Invalid date provided.')
        return v

    @field_validator('panDeclaration')
    @classmethod
    def validate_pan_declaration(cls, v: Optional[bool], info: FieldValidationInfo) -> Optional[bool]:
        non_proprietary_org_types = {'2', '3', '4', '5', '6', '7', '8', '9', '10', '11'}
        is_pan_required = info.data.get('organizationType') in non_proprietary_org_types
        has_pan_field = info.data.get('hasPan')

        if is_pan_required and has_pan_field == 'yes':
            if not v:
                raise ValueError('You must agree to the PAN declaration.')
        return v

    @field_validator('hasGstin')
    @classmethod
    def validate_gstin_conditional(cls, v: Optional[str], info: FieldValidationInfo) -> Optional[str]:
        if v == 'no' and info.data.get('totalTurnoverA') is not None and info.data['totalTurnoverA'] > 4000000:
            raise ValueError('GSTIN is mandatory if turnover exceeds ₹40 Lakhs.')
        return v

# --- API Endpoints ---
@app.post("/validate-pan")
async def validate_pan_endpoint(pan_data: PanValidationRequest):
    """
    Validates PAN details (PAN, name, DOB) against mock data.
    In a real-world scenario, this would involve a government API call.
    """
    # Simulate a successful PAN validation
    # A real implementation would call an external service
    return {"isValid": True, "message": "PAN details are valid."}

@app.post("/submit")
async def submit_udyam_form(form_data: UdyamFormRequest):
    """
    Receives and validates Udyam registration form data.
    """
    try:
        db = SessionLocal()
        new_registration = UdyamRegistration(
            adharno=form_data.adharno,
            ownername=form_data.ownername,
            organization_type=form_data.organizationType,
            pan=form_data.pan,
            pan_name=form_data.panName,
            dob=form_data.dob,
            aadhaarDeclaration=form_data.aadhaarDeclaration,
            hasPan=form_data.hasPan,
            dobType=form_data.dobType,
            panDeclaration=form_data.panDeclaration,
            hasGstin=form_data.hasGstin,
            totalTurnoverA=form_data.totalTurnoverA,
            totalTurnoverB=form_data.totalTurnoverB
        )
        db.add(new_registration)
        db.commit()
        db.refresh(new_registration)
        return {"message": "Form submitted successfully!", "id": new_registration.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")
    finally:
        db.close()