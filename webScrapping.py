import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys

def scrape_step(driver):
    """Extracts input fields, labels, dropdowns, and buttons from current page."""
    page_data = {
        "inputs": [],
        "labels": [],
        "dropdowns": [],
        "buttons": []
    }

    # Inputs
    inputs = driver.find_elements(By.TAG_NAME, "input")
    for inp in inputs:
        field_data = {
            "name": inp.get_attribute("name"),
            "id": inp.get_attribute("id"),
            "type": inp.get_attribute("type"),
            "placeholder": inp.get_attribute("placeholder"),
            "pattern": inp.get_attribute("pattern"),
            "maxlength": inp.get_attribute("maxlength"),
            "minlength": inp.get_attribute("minlength"),
            "title": inp.get_attribute("title")
        }
        page_data["inputs"].append(field_data)

    # Labels
    labels = driver.find_elements(By.TAG_NAME, "label")
    for label in labels:
        label_data = {
            "for": label.get_attribute("for"),
            "text": label.text.strip()
        }
        page_data["labels"].append(label_data)

    # Dropdowns
    dropdowns = driver.find_elements(By.TAG_NAME, "select")
    for dd in dropdowns:
        options_list = [opt.text.strip() for opt in dd.find_elements(By.TAG_NAME, "option")]
        dropdown_data = {
            "name": dd.get_attribute("name"),
            "id": dd.get_attribute("id"),
            "options": options_list
        }
        page_data["dropdowns"].append(dropdown_data)

    # Buttons
    buttons = driver.find_elements(By.TAG_NAME, "button")
    for btn in buttons:
        button_data = {
            "id": btn.get_attribute("id"),
            "type": btn.get_attribute("type"),
            "text": btn.text.strip()
        }
        page_data["buttons"].append(button_data)

    return page_data


# Configure Chrome
options = Options()
options.add_argument("--headless")
options.add_argument("--disable-gpu")

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# Step 1: Aadhaar + OTP Validation
url = "https://udyamregistration.gov.in/UdyamRegistration.aspx"
driver.get(url)
time.sleep(5)

data = {"step1": scrape_step(driver)}

# Try moving to Step 2 (PAN Validation)
try:
    aadhaar_input = driver.find_element(By.ID, "txtAadhaar")
    aadhaar_input.send_keys("123412341234")  # Dummy Aadhaar

    # Click Validate Aadhaar (button id might change)
    validate_btn = driver.find_element(By.ID, "btnValidateAadhaar")
    validate_btn.click()

    time.sleep(5)  # Wait for step change
except Exception as e:
    print("⚠ Could not proceed to Step 2 automatically:", e)

# Step 2: PAN Validation
data["step2"] = scrape_step(driver)

# Save to JSON
with open("udyam_form_steps1_2.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

driver.quit()

print("✅ Data from Step 1 & Step 2 saved to udyam_form_steps1_2.json")
