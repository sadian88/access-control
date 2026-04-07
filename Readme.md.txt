Documento de Definición Arquitectónica y Funcional
Proyecto: MVP Portería Virtual Interactiva (V2 - Control de Visitas y Tiempos)
1. Descripción General del Sistema
El sistema es una solución centralizada basada en la web para la monitorización, identificación facial y control de tiempos en porterías de conjuntos cerrados. A través de una cámara conectada a un navegador web (Frontend de Portería), captura los rostros de las personas que ingresan o salen. Utiliza inteligencia artificial en el servidor para extraer características biométricas y compararlas con una base de datos vectorial.
Alcance de esta versión: El sistema actúa como un vigilante digital interactivo. Identifica entradas y salidas, calculando el tiempo de permanencia en el edificio. Si detecta a un desconocido, alerta al administrador para que registre sus datos mediante un formulario. El sistema no controla la apertura física de puertas; su comunicación es puramente informativa mediante notificaciones push al panel de control y mensajes visuales/auditivos en la pantalla de la portería.

________________________________________
2. Descripción de Módulos del Sistema
1.	Módulo de Captura e Interacción (Cliente Web): Detecta el rostro, envía el fotograma al servidor y actúa como pantalla interactiva, mostrando mensajes de estado ("Bienvenido", "Hasta luego, estuviste 2 horas", "Por favor, aguarde").
2.	Módulo de Extracción y Emparejamiento Biométrico: Microservicio que procesa la imagen, extrae el embedding (512d) y consulta PostgreSQL (pgvector) buscando similitudes con residentes o visitantes previos.
3.	Módulo de Gestión de Visitantes: Interfaz en el panel administrativo que reacciona a los eventos de "Desconocido". Despliega automáticamente un formulario para capturar: Cédula, Nombre Completo, Email, Teléfono, Dirección/Apto de destino, vinculando estos datos al rostro recién capturado.
4.	Módulo de Control de Estados y Tiempos: Motor lógico en el backend que evalúa el último estado conocido de una persona identificada (Adentro o Afuera). Calcula la diferencia de tiempo (Delta Time) entre el registro de entrada y el de salida.
5.	Módulo de Notificaciones en Tiempo Real: Canal WebSocket que mantiene al guardia informado de cada flujo (Llegadas, Salidas, Alertas de Desconocidos).
6.	Módulo de Auditoría y Registro de Eventos: Base de datos histórica inmutable de todos los movimientos, tiempos de estancia y registros fotográficos.
________________________________________
3. Listado de Funcionalidades
•	Detección y Reconocimiento Facial en Vivo: Procesamiento continuo sin necesidad de hardware especializado en portería.
•	Gestión de Estados (Llegada/Salida): El sistema infiere si la persona está entrando o saliendo basándose en su ubicación lógica previa (Si estaba Afuera $\rightarrow$ Entra; Si estaba Adentro $\rightarrow$ Sale).
•	Flujo de Desconocidos a Visitantes: Alerta push inmediata ante un rostro no registrado, habilitando un formulario rápido para darle ingreso formal al sistema.
•	Cálculo de Tiempos de Estancia: Contabilización exacta de minutos/horas que un visitante o residente pasa dentro del conjunto.
•	Interacción en Pantalla de Portería: Retorno de mensajes visuales confirmando la acción (Bienvenida al entrar, Despedida + Tiempo al salir).
•	Dashboard Administrativo: Vista en tiempo real de quién está actualmente "Adentro" del conjunto y registro histórico de logs.
________________________________________
4. Casos de Uso
Caso de Uso 1: Llegada de una persona conocida (Residente/Visita Registrada)
1.	Toño se para frente a la cámara. Su último estado en el sistema es OUT.
2.	El sistema lo identifica, cambia su estado a IN y guarda la hora de entrada.
3.	La pantalla de la portería muestra: "¡Bienvenido de nuevo, Toño!"
4.	El administrador recibe un push: "✅ Ingreso: Toño (Apto 401)".
Caso de Uso 2: Llegada de una persona desconocida (Nueva Visita)
1.	Una persona no registrada se acerca a la cámara. El sistema no halla similitud vectorial.
2.	La pantalla de la portería muestra: "Aguarde un momento, notificando a portería..."
3.	El administrador recibe un push de alerta con la foto capturada. Al hacer clic, se abre el Formulario de Nueva Visita.
4.	El administrador llena los datos solicitados (Cédula, Nombre, Email, Teléfono, Dirección) y aprueba el ingreso.
5.	El sistema guarda el rostro junto con los datos, estableciendo su estado inicial como IN.
Caso de Uso 3: Salida de una persona
1.	Una persona registrada (o la visita del Caso 2) se acerca a la cámara para salir. Su último estado es IN.
2.	El sistema lo reconoce, evalúa su hora de entrada y calcula que estuvo 2 horas y 15 minutos. Cambia su estado a OUT.
3.	La pantalla de la portería muestra: "¡Hasta luego! Tiempo en el edificio: 2h 15m."
4.	El administrador recibe un push: "🚪 Salida: [Nombre] ha salido. Tiempo total: 2h 15m".
________________________________________
5. Flujos del Sistema (Diagramas)
Fragmento de código
sequenceDiagram
    autonumber
    participant Cliente as Pantalla Portería (Frontend)
    participant API as Backend (FastAPI)
    participant Motor as IA InsightFace
    participant DB as PostgreSQL (pgvector)
    participant Admin as Dashboard Admin (Frontend)

    Note over API, Admin: WebSockets Conectados

    Cliente->>API: POST /api/v1/identify (Frame Base64)
    API->>Motor: Extraer Embedding Facial
    Motor-->>API: Vector 512d
    API->>DB: Buscar similitud en DB
    
    alt Similitud Encontrada (Persona Registrada)
        DB-->>API: Retorna Perfil y Último Estado (IN/OUT)
        
        alt Estado Actual == OUT (Flujo de Entrada)
            API->>DB: Actualiza Estado a IN y guarda Timestamp_Entrada
            API->>Admin: Push WebSocket (Llegada, Datos Perfil)
            API-->>Cliente: Retorna Msg: "¡Bienvenido [Nombre]!"
            Admin->>Admin: Muestra notificación verde
            
        else Estado Actual == IN (Flujo de Salida)
            API->>DB: Calcula Tiempo Estancia (Ahora - Timestamp_Entrada)
            API->>DB: Actualiza Estado a OUT y guarda Log
            API->>Admin: Push WebSocket (Salida, Tiempo Estancia)
            API-->>Cliente: Retorna Msg: "¡Hasta luego! Tiempo: Xh Ym"
            Admin->>Admin: Muestra notificación gris de salida
        end
        
    else Sin Similitud (Desconocido)
        DB-->>API: Null
        API->>DB: Guarda Imagen Temporal
        API->>Admin: Push WebSocket Alerta (Desconocido, ID Temporal, Foto)
        API-->>Cliente: Retorna Msg: "Aguarde, contactando guardia..."
        Admin->>Admin: Administrador abre notificación
        Admin->>Admin: Despliega Formulario de Visita
        
        Note over Admin, API: Guardia llena Cédula, Nombre, Email, Tel, Dirección
        Admin->>API: POST /api/v1/visitors (Datos + ID Temporal)
        API->>DB: Crea Registro, vincula Vector y asigna Estado = IN
        API->>Admin: Confirma Registro Exitoso
        API-->>Cliente: (Opcional vía WebSocket) "Ingreso Autorizado"
    End




