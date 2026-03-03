#!/bin/bash

# ========================================
# ORDINE ARCHITETTI CALTANISSETTA
# Script di Setup Automatico - v1.0.0
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║         ORDINE ARCHITETTI P.P.C. CALTANISSETTA         ║"
    echo "║                   Setup Automatico                      ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${PURPLE}==>${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  ${1}${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Controllo prerequisiti..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js trovato: $NODE_VERSION"
        
        # Check Node.js version (requires >= 16.0.0)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 16 ]; then
            print_error "Node.js versione >= 16.0.0 richiesta. Versione attuale: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js non trovato. Installa Node.js >= 16.0.0"
        print_info "Download: https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm trovato: v$NPM_VERSION"
    else
        print_error "npm non trovato. Installa npm"
        exit 1
    fi
    
    # Check git (optional)
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "Git trovato: $GIT_VERSION"
    else
        print_warning "Git non trovato (opzionale)"
    fi
}

# Create directory structure
create_structure() {
    print_step "Creazione struttura directory..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p frontend/public
    mkdir -p frontend/src
    
    print_success "Struttura directory creata"
}

# Install backend dependencies
install_backend() {
    print_step "Installazione dipendenze backend..."
    
    if [ -d "backend" ]; then
        cd backend
        
        if [ -f "package.json" ]; then
            npm install
            print_success "Dipendenze backend installate"
        else
            print_error "package.json non trovato in backend/"
            exit 1
        fi
        
        cd ..
    else
        print_error "Directory backend/ non trovata"
        exit 1
    fi
}

# Install frontend dependencies
install_frontend() {
    print_step "Installazione dipendenze frontend..."
    
    if [ -d "frontend" ]; then
        cd frontend
        
        if [ -f "package.json" ]; then
            npm install
            print_success "Dipendenze frontend installate"
        else
            print_error "package.json non trovato in frontend/"
            exit 1
        fi
        
        cd ..
    else
        print_error "Directory frontend/ non trovata"
        exit 1
    fi
}

# Setup environment
setup_environment() {
    print_step "Configurazione ambiente..."
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            print_success "File .env creato da template"
            print_info "Modifica backend/.env con le tue configurazioni"
        else
            print_warning "Template .env.example non trovato"
        fi
    else
        print_info "File .env già esistente"
    fi
    
    # Create uploads directory
    mkdir -p backend/uploads
    chmod 755 backend/uploads
    print_success "Directory uploads configurata"
    
    # Create logs directory
    mkdir -p backend/logs
    chmod 755 backend/logs
    print_success "Directory logs configurata"
}

# Test installation
test_installation() {
    print_step "Test installazione..."
    
    # Test backend
    cd backend
    if npm run test --if-present; then
        print_success "Test backend passati"
    else
        print_warning "Test backend non configurati o falliti"
    fi
    cd ..
    
    # Test frontend
    cd frontend
    if npm run test -- --watchAll=false --passWithNoTests; then
        print_success "Test frontend passati"
    else
        print_warning "Test frontend non configurati o falliti"
    fi
    cd ..
}

# Create startup scripts
create_scripts() {
    print_step "Creazione script di avvio..."
    
    # Start script for Unix
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Avvio App Ordine Architetti Caltanissetta..."

# Avvia backend in background
cd backend
npm start &
BACKEND_PID=$!
echo "Backend avviato (PID: $BACKEND_PID)"

# Aspetta che il backend sia pronto
sleep 3

# Avvia frontend
cd ../frontend
echo "Avvio frontend..."
npm start

# Cleanup quando termina
kill $BACKEND_PID
EOF
    chmod +x start.sh
    
    # Dev script for Unix  
    cat > dev.sh << 'EOF'
#!/bin/bash
echo "🔧 Avvio App Ordine Architetti Caltanissetta (Development)..."

# Avvia backend in development mode in background
cd backend
npm run dev &
BACKEND_PID=$!
echo "Backend (dev) avviato (PID: $BACKEND_PID)"

# Aspetta che il backend sia pronto
sleep 3

# Avvia frontend
cd ../frontend
echo "Avvio frontend..."
npm start

# Cleanup quando termina
kill $BACKEND_PID
EOF
    chmod +x dev.sh
    
    # Windows batch files
    cat > start.bat << 'EOF'
@echo off
echo 🚀 Avvio App Ordine Architetti Caltanissetta...

start /B cmd /c "cd backend && npm start"
timeout /t 3 /nobreak >nul
cd frontend
npm start
EOF
    
    cat > dev.bat << 'EOF'
@echo off
echo 🔧 Avvio App Ordine Architetti Caltanissetta (Development)...

start /B cmd /c "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
cd frontend
npm start
EOF
    
    print_success "Script di avvio creati"
}

# Show final instructions
show_instructions() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║                   🎉 SETUP COMPLETATO! 🎉              ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}📋 PROSSIMI PASSI:${NC}"
    echo ""
    echo -e "${YELLOW}1.${NC} Configura il file backend/.env con i tuoi parametri"
    echo -e "${YELLOW}2.${NC} Avvia l'applicazione:"
    echo ""
    echo -e "${PURPLE}   # Produzione${NC}"
    echo -e "   ./start.sh    ${BLUE}(Linux/Mac)${NC}"
    echo -e "   start.bat     ${BLUE}(Windows)${NC}"
    echo ""
    echo -e "${PURPLE}   # Sviluppo${NC}"
    echo -e "   ./dev.sh      ${BLUE}(Linux/Mac)${NC}"
    echo -e "   dev.bat       ${BLUE}(Windows)${NC}"
    echo ""
    echo -e "${PURPLE}   # Manuale (2 terminali)${NC}"
    echo -e "   cd backend && npm start"
    echo -e "   cd frontend && npm start"
    echo ""
    echo -e "${BLUE}🌐 ACCESSO:${NC}"
    echo -e "   App:     ${GREEN}http://localhost:3000${NC}"
    echo -e "   API:     ${GREEN}http://localhost:5000${NC}"
    echo ""
    echo -e "${BLUE}👤 ACCOUNT TEST:${NC}"
    echo -e "   📧 mario.rossi@test.it | 🔑 password123 (Architetto)"
    echo -e "   📧 laura.bianchi@test.it | 🔑 password123 (Architetto)"
    echo -e "   📧 giuseppe.verdi@test.it | 🔑 password123 (Registrato)"
    echo ""
    echo -e "${BLUE}📞 SUPPORTO:${NC}"
    echo -e "   📧 architetti@caltanissetta.archiworld.it"
    echo -e "   📱 0934 55 30 40"
    echo ""
    echo -e "${GREEN}Buon lavoro! 🏛️✨${NC}"
}

# Main execution
main() {
    print_header
    
    check_prerequisites
    create_structure
    install_backend
    install_frontend
    setup_environment
    test_installation
    create_scripts
    
    show_instructions
}

# Run main function
main "$@"