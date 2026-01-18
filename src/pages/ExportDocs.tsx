import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Code, Database, ArrowLeft, FileType, File } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { useState } from "react";

export default function ExportDocs() {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/docs/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTXT = async () => {
    try {
      const response = await fetch('/docs/PROJECT_BLUEPRINT.md');
      const content = await response.text();
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PROJECT_BLUEPRINT.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading TXT:', error);
    }
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/docs/PROJECT_BLUEPRINT.md');
      const content = await response.text();
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      const lineHeight = 6;
      let y = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SysThemPlus - Project Blueprint', margin, y);
      y += 15;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const lines = content.split('\n');
      
      for (const line of lines) {
        // Handle headers
        if (line.startsWith('# ')) {
          y += 8;
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          const text = line.replace('# ', '');
          pdf.text(text, margin, y);
          y += 10;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
        } else if (line.startsWith('## ')) {
          y += 6;
          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          const text = line.replace('## ', '');
          pdf.text(text, margin, y);
          y += 8;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
        } else if (line.startsWith('### ')) {
          y += 4;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          const text = line.replace('### ', '');
          pdf.text(text, margin, y);
          y += 7;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
        } else if (line.trim()) {
          // Regular text - wrap long lines
          const splitLines = pdf.splitTextToSize(line, maxWidth);
          for (const splitLine of splitLines) {
            if (y > pageHeight - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(splitLine, margin, y);
            y += lineHeight;
          }
        } else {
          y += 3; // Empty line spacing
        }

        // Check for page break
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      }

      pdf.save('PROJECT_BLUEPRINT.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadJSONTXT = async () => {
    try {
      const response = await fetch('/docs/project-schema.json');
      const content = await response.text();
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'project-schema.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading TXT:', error);
    }
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

        {/* Blueprint Downloads */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Blueprint Complet</CardTitle>
                <CardDescription>Documentation complète du projet</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Contient toute l'architecture du projet, le schéma de base de données, 
              les edge functions, les composants React, et les instructions de configuration.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button 
                onClick={() => handleDownload('PROJECT_BLUEPRINT.md')} 
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Markdown (.md)
              </Button>
              <Button 
                onClick={handleDownloadTXT} 
                variant="outline"
                className="w-full"
              >
                <File className="w-4 h-4 mr-2" />
                Texte (.txt)
              </Button>
              <Button 
                onClick={handleDownloadPDF} 
                variant="secondary"
                className="w-full"
                disabled={generating}
              >
                <FileType className="w-4 h-4 mr-2" />
                {generating ? 'Génération...' : 'PDF (.pdf)'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schema Downloads */}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Button 
                onClick={() => handleDownload('project-schema.json')} 
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON (.json)
              </Button>
              <Button 
                onClick={handleDownloadJSONTXT} 
                variant="outline"
                className="w-full"
              >
                <File className="w-4 h-4 mr-2" />
                Texte (.txt)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
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
                  Envoyez le contenu du fichier PROJECT_BLUEPRINT à Lovable en demandant: 
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