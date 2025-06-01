
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BatchLigandInputProps {
  onLigandsChange: (ligands: string[]) => void;
  ligands: string[];
}

const BatchLigandInput: React.FC<BatchLigandInputProps> = ({ onLigandsChange, ligands }) => {
  const [dragActive, setDragActive] = useState(false);
  const [batchText, setBatchText] = useState('');

  const validateSmiles = (smiles: string) => {
    const smilesPattern = /^[A-Za-z0-9@+\-\[\]()=#$/\\%.]+$/;
    return smilesPattern.test(smiles.trim()) && smiles.trim().length > 0;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processBatchContent(content);
    };
    reader.readAsText(file);
  };

  const processBatchContent = (content: string) => {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const validSmiles: string[] = [];
    const invalidLines: string[] = [];

    lines.forEach((line, index) => {
      // Skip headers or comments
      if (line.startsWith('#') || line.toLowerCase().includes('smiles')) return;
      
      // Handle CSV format (take first column as SMILES)
      const smiles = line.split(',')[0].trim();
      
      if (validateSmiles(smiles)) {
        validSmiles.push(smiles);
      } else {
        invalidLines.push(`Line ${index + 1}: ${line}`);
      }
    });

    if (validSmiles.length > 0) {
      onLigandsChange([...ligands, ...validSmiles]);
      toast({
        title: "Batch Upload Successful",
        description: `Added ${validSmiles.length} valid SMILES. ${invalidLines.length} invalid entries skipped.`,
      });
    }

    if (invalidLines.length > 0) {
      console.warn('Invalid SMILES entries:', invalidLines);
    }
  };

  const handleBatchTextSubmit = () => {
    if (batchText.trim()) {
      processBatchContent(batchText);
      setBatchText('');
    }
  };

  const removeLigand = (index: number) => {
    const newLigands = ligands.filter((_, i) => i !== index);
    onLigandsChange(newLigands);
  };

  const downloadTemplate = () => {
    const template = `# SMILES Batch Template
# Format: One SMILES per line or CSV with SMILES in first column
CCO
C1=CC=CC=C1
CC(=O)OC1=CC=CC=C1C(=O)O
CN1C=NC2=C1C(=O)N(C(=O)N2C)C`;
    
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smiles_template.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Upload className="h-5 w-5" />
          Batch Ligand Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            Drag & drop a file here, or click to browse
          </p>
          <Input
            type="file"
            accept=".txt,.csv,.smi"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>Choose File</span>
            </Button>
          </Label>
          <div className="mt-2 flex justify-center">
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-3 w-3 mr-1" />
              Download Template
            </Button>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          <Label>Or paste SMILES (one per line)</Label>
          <Textarea
            placeholder={`CCO\nC1=CC=CC=C1\nCC(=O)OC1=CC=CC=C1C(=O)O`}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            className="font-mono text-sm"
            rows={4}
          />
          <Button onClick={handleBatchTextSubmit} disabled={!batchText.trim()}>
            Add SMILES
          </Button>
        </div>

        {/* Current Ligands */}
        {ligands.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Current Ligands ({ligands.length})</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onLigandsChange([])}
              >
                Clear All
              </Button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {ligands.map((smiles, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="font-mono text-xs flex-1 truncate">{smiles}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLigand(index)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{ligands.length} ligands ready</Badge>
              <Badge variant="outline">Batch processing enabled</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchLigandInput;
