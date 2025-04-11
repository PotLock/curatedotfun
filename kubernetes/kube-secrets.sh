kubectl delete secret app-secrets
kubectl create secret generic app-secrets --from-env-file=backend/.env
