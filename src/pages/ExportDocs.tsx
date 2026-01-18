import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Code, Database, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExportDocs() {
  const navigate = useNavigate();

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/docs/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            📦 Documentation du Projet
          </h1>
          <p className="text-muted-foreground text-lg">
            Téléchargez tous les fichiers nécessaires pour recréer le projet SysThemPlus
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Blueprint Complet</CardTitle>
                  <CardDescription>Documentation Markdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Contient toute l'architecture du projet, le schéma de base de données, 
                les edge functions, les composants React, et les instructions de configuration.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Vue d'ensemble du projet</li>
                <li>• Stack technique complète</li>
                <li>• Schéma SQL détaillé</li>
                <li>• Code des Edge Functions</li>
                <li>• Architecture frontend</li>
                <li>• Instructions de déploiement</li>
              </ul>
              <Button 
                onClick={() => handleDownload('PROJECT_BLUEPRINT.md')} 
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PROJECT_BLUEPRINT.md
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Code className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>Schéma JSON</CardTitle>
                  <CardDescription>Configuration structurée</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Fichier JSON contenant la structure complète du projet, 
                utilisable pour l'automatisation et la génération de code.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Configuration technique</li>
                <li>• Définitions des tables</li>
                <li>• Relations et contraintes</li>
                <li>• Routes de l'application</li>
                <li>• Liste des composants</li>
                <li>• Hooks personnalisés</li>
              </ul>
              <Button 
                onClick={() => handleDownload('project-schema.json')} 
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger project-schema.json
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Database className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <CardTitle>Comment utiliser ces fichiers ?</CardTitle>
                <CardDescription>Guide de recréation du projet</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">1. Créer un nouveau projet Lovable</h4>
                <p className="text-muted-foreground">
                  Allez sur lovable.dev et créez un nouveau projet. Activez Lovable Cloud pour la base de données.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">2. Copier le contenu du Blueprint</h4>
                <p className="text-muted-foreground">
                  Envoyez le contenu du fichier PROJECT_BLUEPRINT.md à Lovable en demandant: 
                  "Recréez ce projet en suivant exactement cette documentation"
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">3. Exécuter les migrations SQL</h4>
                <p className="text-muted-foreground">
                  Les commandes SQL sont incluses dans le Blueprint. Lovable les exécutera automatiquement.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">4. Configurer le Super Admin</h4>
                <p className="text-muted-foreground">
                  Une fois le projet créé, appelez l'edge function setup-super-admin avec votre email.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Version 1.0.0 • Généré le {new Date().toLocaleDateString('fr-FR')}</p>
          <p className="mt-1">SysThemPlus - Système de gestion scolaire multi-tenant</p>
        </div>
      </div>
    </div>
  );
}
