from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db

# Automatically create all tables in expenses.db
models.Base.metadata.create_all(bind=engine)


app = FastAPI(title="SmartSplit - Expense Manager")

@app.get("/", response_class=FileResponse)
def read_root():
    return FileResponse("templates/index.html")

# ==================== USER ROUTES ====================
# ==================== USER ROUTES ====================

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(name=user.name, email=user.email)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


# ==================== EXPENSE ROUTES ====================

@app.post("/expenses/", response_model=schemas.ExpenseResponse)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    # Check if the payer exists
    payer = db.query(models.User).filter(models.User.id == expense.payer_id).first()
    if not payer:
        raise HTTPException(status_code=440, detail="Payer user ID not found")
    
    new_expense = models.Expense(
        title=expense.title,
        amount=expense.amount,
        payer_id=expense.payer_id
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@app.get("/expenses/", response_model=List[schemas.ExpenseResponse])
def get_all_expenses(db: Session = Depends(get_db)):
    expenses = db.query(models.Expense).all()
    return expenses
# ==================== SETTLEMENT ROUTES ====================

@app.get("/settlements/balances/", response_model=List[schemas.BalanceResponse])
def calculate_balances(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    expenses = db.query(models.Expense).all()

    total_users = len(users)
    if total_users == 0:
        return []

    # Calculate total spent across all expenses
    total_spent = sum(exp.amount for exp in expenses)
    fair_share = total_spent / total_users

    balances = []
    for user in users:
        # Sum expenses paid by this specific user
        paid_by_user = sum(exp.amount for exp in expenses if exp.payer_id == user.id)
        net_balance = paid_by_user - fair_share

        balances.append(
            schemas.BalanceResponse(
                user_id=user.id,
                name=user.name,
                net_balance=round(net_balance, 2)
            )
        )

    return balances
@app.get("/settlements/simplify/", response_model=List[schemas.DebtSettlementResponse])
def simplify_debts(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    expenses = db.query(models.Expense).all()

    total_users = len(users)
    if total_users == 0:
        return []

    total_spent = sum(exp.amount for exp in expenses)
    fair_share = total_spent / total_users

    # Separate users into debtors (owes money) and creditors (is owed money)
    debtors = []   # (user, amount_they_owe)
    creditors = [] # (user, amount_they_are_owed)

    for user in users:
        paid = sum(exp.amount for exp in expenses if exp.payer_id == user.id)
        net = paid - fair_share
        if net < -0.01:
            debtors.append({'user': user, 'amount': abs(net)})
        elif net > 0.01:
            creditors.append({'user': user, 'amount': net})

    settlements = []
    i, j = 0, 0

    # Greedy settlement matching
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]

        settled_amount = min(debtor['amount'], creditor['amount'])
        settlements.append(
            schemas.DebtSettlementResponse(
                payer_id=debtor['user'].id,
                payer_name=debtor['user'].name,
                payee_id=creditor['user'].id,
                payee_name=creditor['user'].name,
                amount=round(settled_amount, 2)
            )
        )

        debtor['amount'] -= settled_amount
        creditor['amount'] -= settled_amount

        if debtor['amount'] < 0.01:
            i += 1
        if creditor['amount'] < 0.01:
            j += 1

    return settlements