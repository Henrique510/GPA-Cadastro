from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.alert import Alert
import pandas as pd
import time

# Inicia o driver
driver = webdriver.Chrome()

# Maximiza a janela do navegador
driver.maximize_window()

# Acessa a página
driver.get("http://localhost:3001/Usuario.html")

# Carrega a planilha
df = pd.read_excel("public/python/BASE.xlsx")

# Espera carregar a página
time.sleep(2)

# Loop para cada linha da planilha
for index, row in df.iterrows():
    driver.find_element(By.ID, "btnAdicionarUsuario").click()

    # Preenche o campo 'Matrícula'
    driver.find_element(By.ID, "matriculaColaborador").clear()
    driver.find_element(By.ID, "matriculaColaborador").send_keys(str(row["Matricula"]))

    # Preenche o campo 'Nome'
    driver.find_element(By.ID, "nomeColaborador").clear()
    driver.find_element(By.ID, "nomeColaborador").send_keys(str(row["Nome"]))

    # Espera o campo 'Turno' ser visível e clicável
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "turnoColaborador")))

    # Interage com o campo select (Turno)
    turno_element = driver.find_element(By.ID, "turnoColaborador")
    select_turno = Select(turno_element)
    select_turno.select_by_visible_text(str(row["Turno"]))

    # Espera o campo 'Setor' ser visível e clicável
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "setorColaborador")))

    # Interage com o campo select (Setor)
    setor_element = driver.find_element(By.ID, "setorColaborador")
    select_setor = Select(setor_element)
    select_setor.select_by_visible_text(str(row["Setor"]))

    # Clica no botão de enviar/cadastrar
    driver.find_element(By.ID, "modalButton").click()

    # Espera o alerta aparecer e o aceita (pressiona Enter)
    WebDriverWait(driver, 10).until(EC.alert_is_present())  # Espera o alerta aparecer
    alert = Alert(driver)  # Captura o alerta
    alert.accept()  # Aceita o alerta (equivalente a pressionar "Enter")

    # Espera antes de ir para o próximo cadastro
    time.sleep(1.5)
