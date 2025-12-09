export const store = {
    currentUser: null,
    currentSection: '',
    currentPage: 1,
    itemsPerPage: 10,
    allData: {
        acta: [],
        documentos: [
            { id: 101, title: 'Plan de Trabajo 2025-1', type: 'Informe', date: '2025-02-10', purpose: 'Definir objetivos y cronograma para la cohorte 2025-1.' },
            { id: 102, title: 'Resultados Diagnóstico Inicial', type: 'Memorando', date: '2025-03-01', purpose: 'Socializar los resultados de la evaluación diagnóstica inicial.' }
        ],
        sites: []
    },
    professors: [],
    groups: [
        { id: 'G-001', name: '2025-1', date: '2025-02-01', description: 'Cohorte 2025-1', features: 'Investigación aplicada', advisorId: 'P-001' },
        { id: 'G-002', name: '2025-2', date: '2025-08-01', description: 'Cohorte 2025-2', features: 'Plan piloto', advisorId: 'P-002' }
    ],
    students: [],
    users: {
        admin: { password: 'admin123', role: 'administrador', name: 'Administrador' },
        coord: { password: 'coord123', role: 'coordinador', name: 'Coordinador' },
        prof: { password: 'prof123', role: 'profesor', name: 'Profesor' },
        est: { password: 'est123', role: 'estudiante', name: 'Estudiante' }
    },
    // Utilidades - Facultades y Programas
    faculties: [
        { id: 'FAC-001', name: 'Educación', description: 'Facultad de Educación' },
        { id: 'FAC-002', name: 'Ciencias y Tecnología', description: 'Facultad de Ciencia y Tecnología' }
    ],
    programs: [
        { id: 'PROG-001', code: '090502', name: 'Lic. en Recreación', facultyId: 'FAC-001', documents: '', description: 'Programa de Licenciatura en Recreación' },
        { id: 'PROG-002', code: '090501', name: 'Lic. en Educación Infantil', facultyId: 'FAC-001', documents: '', description: 'Programa de Licenciatura en Educación Infantil' }
    ],
    subjects: [
        { id: 'SUBJ-001', code: 'REC101', name: 'Fundamentos de Recreación', programId: 'PROG-001', credits: 3, hoursPerWeek: 4 },
        { id: 'SUBJ-002', code: 'REC201', name: 'Pedagogía del Juego', programId: 'PROG-001', credits: 4, hoursPerWeek: 6 },
        { id: 'SUBJ-003', code: 'EDU101', name: 'Desarrollo Infantil', programId: 'PROG-002', credits: 3, hoursPerWeek: 4 }
    ],
    planActivities: [
        { id: 'ACT-001', type: 'Apoyo Docencia', name: 'Coordinación de Prácticas', description: 'Coordinación y seguimiento de prácticas pedagógicas' },
        { id: 'ACT-002', type: 'Investigación', name: 'Proyecto Recreación Comunitaria', description: 'Investigación sobre impacto social de la recreación' },
        { id: 'ACT-003', type: 'Gestión', name: 'Comité Curricular', description: 'Participación en comité curricular del programa' }
    ],
    deliveryForms: [
        { id: 'DEL-001', name: 'Informe Escrito' },
        { id: 'DEL-002', name: 'Acta de Reunión' },
        { id: 'DEL-003', name: 'Artículo Publicado' },
        { id: 'DEL-004', name: 'Software/Prototipo' }
    ],
    verificationMeans: [
        { id: 'VER-001', name: 'Certificado' },
        { id: 'VER-002', name: 'Listado de Asistencia' },
        { id: 'VER-003', name: 'Enlace Web' },
        { id: 'VER-004', name: 'Documento PDF' }
    ],
    // Plan de Trabajo Docente
    workPlans: [
        {
            id: 'WP-001',
            professorId: 'P-001',
            period: '2025-1',
            year: 2025,
            status: 'draft',
            generalInfo: {
                facultyId: 'FAC-001',
                programId: 'PROG-001',
                department: 'Pedagogía',
                vinculationType: 'Planta',
                dedication: 40 // horas semanales
            },
            blocks: {
                docencia: [
                    { id: 1, subject: 'Fundamentos de Recreación', code: 'REC-101', curriculum: '090502', students: 30, hoursWeek: 4, days: 'Lunes, Miércoles', type: 'Docencia directa' }
                ],
                apoyoDocencia: [
                    { id: 1, type: 'Preparación', description: 'Actualización de contenidos', hoursWeek: 3, days: 'Martes', evidence: null }
                ],
                trabajosGrado: [
                    { id: 1, count: 2, hoursTotal: 4, evidence: null }
                ],
                investigacion: [
                    { id: 1, project: 'Juego y aprendizaje', hoursWeek: 6, startDate: '2025-02-01', endDate: '2025-12-31', evidence: null }
                ],
                pdi: [
                    { id: 1, pdiAction: '1.2.2-04', activity: 'Participación en CINNDET', hoursWeek: 2, mejoramientoAction: 'ACC-001' }
                ],
                gestion: [
                    { id: 1, activity: 'Comité curricular', curriculum: '090502', hours: 2, evidence: null, mejoramientoAction: 'ACC-002' }
                ]
            },
            calculatedHours: {
                docencia: 4,
                apoyoDocencia: 3,
                trabajosGrado: 4,
                investigacion: 6,
                pdi: 2,
                gestion: 2,
                total: 21
            }
        }
    ],
    // Acciones del Plan de Desarrollo Institucional (PDI)
    pdiActions: [
        { id: '1.2.2-04', name: 'Mejoramiento de las condiciones laborales y bienestar de los profesores UPN', keywords: ['bienestar', 'cinndet', 'profesores'] },
        { id: '2.1.1-01', name: 'Fortalecimiento de la investigación', keywords: ['investigación', 'proyecto', 'ciencia'] },
        { id: '3.3.1-02', name: 'Extensión y proyección social', keywords: ['extensión', 'comunidad', 'social'] }
    ],
    // Acciones del Plan de Mejoramiento Académico (PMA)
    mejoramientoActions: [
        { id: 'ACC-001', name: 'Actualización curricular', factor: 'Factor 2', characteristic: 'Característica 6', keywords: ['currículo', 'actualización', 'contenidos'] },
        { id: 'ACC-002', name: 'Fortalecimiento de procesos de autoevaluación', factor: 'Factor 1', characteristic: 'Característica 3', keywords: ['autoevaluación', 'calidad', 'mejoramiento'] },
        { id: 'ACC-003', name: 'Investigación formativa', factor: 'Factor 3', characteristic: 'Característica 10', keywords: ['investigación', 'formativa', 'estudiantes'] }
    ]
};
