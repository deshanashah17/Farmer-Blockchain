from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner
from algosdk.abi import Method
from algorand_service import get_client, get_account
import os
from dotenv import load_dotenv

load_dotenv()

APP_ID = int(os.getenv("CONTRACT_APP_ID"))


def call_hello(name: str):
    client = get_client()
    private_key, sender = get_account()

    signer = AccountTransactionSigner(private_key)

    atc = AtomicTransactionComposer()

    method = Method.from_signature("hello(string)void")

    params = client.suggested_params()

    atc.add_method_call(
        app_id=APP_ID,
        method=method,
        sender=sender,
        sp=params,
        signer=signer,
        method_args=[name]
    )

    result = atc.execute(client, 2)

    return {"tx_id": result.tx_ids}